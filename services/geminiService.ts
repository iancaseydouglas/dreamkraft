/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates a composited image by blending multiple source images.
 * @param files An array of files. The first file is treated as the style source.
 * @returns A promise that resolves to the data URL of the composited image.
 */
export const generateCompositedImage = async (
    files: File[],
): Promise<string> => {
    if (files.length < 2) {
        throw new Error("Compositing requires at least two images.");
    }
    console.log(`Starting composite generation with ${files.length} images.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const imageParts = await Promise.all(files.map(file => fileToPart(file)));
    
    const prompt = `You are a master digital artist specializing in photorealistic compositing. Your task is to create a single, cohesive image by blending multiple source images provided.
    
- **Style Source Image (First Image Provided):** The overall lighting, color grading, mood, and artistic style of this image should define the final composite's aesthetic.
- **Content Images (All Subsequent Images):** The key subjects and elements from these images must be seamlessly and intelligently integrated into the new scene.

**Instructions:**
1.  Analyze the Style Source Image to deeply understand its visual characteristics (e.g., time of day, light direction, color palette, texture).
2.  Identify the primary subjects in the Content Images.
3.  Create a new, single, photorealistic composition that logically and artistically combines the subjects from the Content Images.
4.  Crucially, apply the lighting, shadows, and color palette from the Style Source Image to all integrated elements to ensure they look like they belong in the same, unified scene.

Output ONLY the final composited image. Do not return any text.`;
    const textPart = { text: prompt };

    const allParts = [textPart, ...imageParts];

    console.log('Sending composite request to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: allParts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for composite.', response);
    
    return handleApiResponse(response, 'composite');
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter or style applied using generative AI.
 * @param originalImage The original image file.
 * @param stylePrompt The text prompt describing the desired style or filter.
 * @returns A promise that resolves to the styled image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    stylePrompt: string,
): Promise<string> => {
    console.log(`Starting style/filter generation: ${stylePrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Style Request: "${stylePrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final styled image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and style prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for style/filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates an image with a stylized frame and text.
 * @param originalImage The original image file.
 * @param frameStyle The prompt describing the frame style.
 * @param topText Optional text for the top of the frame.
 * @param bottomText Optional text for the bottom of the frame.
 * @returns A promise that resolves to the data URL of the framed image.
 */
export const generateFramedImage = async (
    originalImage: File,
    frameStyle: string,
    topText: string,
    bottomText: string,
): Promise<string> => {
    console.log(`Starting frame generation with style: ${frameStyle}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert graphic designer AI specializing in creating stylized frames for images.
Your task is to add a decorative frame to the provided image. The original image content must remain perfectly centered and completely unchanged.

Frame Style: "${frameStyle}"

Top Text: "${topText}"
Bottom Text: "${bottomText}"

Instructions:
1.  Do not alter the original image in any way. Place it in the center.
2.  Generate a frame around the image that matches the "Frame Style" description.
3.  If "Top Text" is provided, incorporate it into the top part of the frame in a stylized font that matches the frame's aesthetic. Think of the title on a Tarot card or a Magic: The Gathering card.
4.  If "Bottom Text" is provided, incorporate it into the bottom part of the frame, similar to the description box on a Tarot or MTG card, using a matching stylized font.
5.  The final output must be a single image containing the original image and the new frame with text.

Output: Return ONLY the final framed image. Do not return text.`;

    const textPart = { text: prompt };

    console.log('Sending frame request to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for frame.', response);

    return handleApiResponse(response, 'frame');
};
