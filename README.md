# DreamCraft AI Photo Editor

Welcome to DreamCraft, a powerful, intuitive, and AI-driven photo editing application built with React, TypeScript, and the Google Gemini API. DreamCraft simplifies complex photo manipulations into simple text prompts and clicks, making professional-grade editing accessible to everyone.

This project serves as a showcase of modern frontend development, demonstrating a seamless integration of a powerful AI backend with a fluid, responsive, and feature-rich user interface that is fully containerized for easy deployment.

---

## ✨ Features

DreamCraft is packed with a suite of tools that leverage generative AI to offer incredible editing capabilities:

*   **🎨 Theme Support:** Toggle between a sleek, starry dark mode and a clean, professional light mode. Your preference is saved locally.
*   **🎯 Multi-Point Retouching:** Click multiple points on an image to add, remove, or change objects with a simple text description and undo capabilities.
*   **🔄 Object Replacement:** Define an object to replace and what to replace it with (e.g., "replace the `blue car` with a `red bicycle`").
*   **🌈 Creative Filters & Styles:** Instantly transform your photos with artistic presets like Synthwave and Anime, or describe any custom style imaginable.
*   **🔧 Professional Adjustments:** Apply global effects like background blurs, detail enhancement, studio lighting, or even expand the image canvas (outpainting).
*   **🖼️ Stylized Frames:** Add decorative frames and text to your images, perfect for creating content like Tarot cards or posters.
*   **🧩 Image Compositing:** Blend multiple images, using one as a "style source" to apply its lighting and mood to the content of the others.
*   **✂️ Standard Tools:** Includes essential tools like cropping with fixed aspect ratios.
*   **🗂️ Batch Processing:** Pin a favorite frame style and apply it to hundreds of images at once.
*   **💾 Advanced Download Manager:** Select multiple images from your session history and download them as a convenient `.zip` archive.
*   **⏳ Full Edit History:** Every edit creates a new state in a non-destructive history timeline. Undo, redo, or jump to any point in your session.

---

## 🛠️ Tech Stack

*   **Frontend:** [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
*   **Development Server:** [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **AI Model:** [Google Gemini API](https://ai.google.dev/)
*   **Deployment:** [Docker](https://www.docker.com/), [Nginx](https://www.nginx.com/)
*   **Client-Side Archiving:** [JSZip](https://stuk.github.io/jszip/)
*   **Image Cropping:** [React Image Crop](https://www.npmjs.com/package/react-image-crop)

---

## 🚀 Getting Started (Local Development)

To run DreamCraft on your local machine for development purposes, follow these steps:

**1. Prerequisites:**
*   Node.js (v18 or later)
*   npm or yarn

**2. Set Up Environment Variables:**
*   Create a new file named `.env.local` in the root of the project.
*   Add your Gemini API key to this file. The `VITE_` prefix is required by Vite.
    ```
    VITE_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

**3. Install and Run:**
You can use the provided Makefile for convenience.
```bash
# Install dependencies
make install

# Run the development server
make dev
```
The application will be available at `http://localhost:5173`.

---

## 🐳 Docker & Deployment

For a consistent and portable experience, DreamCraft is fully containerized. You can build and run the application with a single command, which is the recommended way for production or easy setup.

**1. Prerequisites:**
*   [Docker](https://www.docker.com/get-started) installed and running.

**2. Build the Docker Image:**
Use the Makefile to run the build script. This creates a production-optimized container image named `dreamcraft`.
```bash
make docker-build
```

**3. Run the Docker Container:**
This command starts the container and makes the application available on port 8080. It securely passes your API key as a runtime environment variable.
```bash
# IMPORTANT: Replace YOUR_API_KEY_HERE with your actual Gemini API key
make docker-run API_KEY="YOUR_API_KEY_HERE"
```
Now, open your browser and navigate to **`http://localhost:8080`**.

**4. Manage the Container:**
The Makefile includes commands to manage the container's lifecycle.
```bash
# Stop the running container
make docker-stop

# View logs from the running container
make docker-logs
```

### Advanced: Running as a Systemd Service

For deploying DreamCraft as a persistent service on a Linux server, you can use the provided `dreamcraft.service` file as a template.

1.  **Create an Environment File**: On your server, create a file to store your API key securely.
    ```bash
    sudo mkdir -p /etc/dreamcraft
    echo "API_KEY=YOUR_API_KEY_HERE" | sudo tee /etc/dreamcraft/environment
    sudo chmod 600 /etc/dreamcraft/environment # Secure the file
    ```
2.  **Move and Configure the Service File**:
    *   Copy the `dreamcraft.service` file to `/etc/systemd/system/`.
    *   Make sure the `ExecStart` command in the service file correctly points to your user and the container name (`dreamcraft`).
3.  **Enable and Start the Service**:
    ```bash
    # Reload systemd to recognize the new service
    sudo systemctl daemon-reload

    # Enable the service to start on boot
    sudo systemctl enable dreamcraft.service

    # Start the service immediately
    sudo systemctl start dreamcraft.service

    # Check the status
    sudo systemctl status dreamcraft.service
    ```
The application will now be running and will automatically restart if the server reboots.

---

## 📖 HOWTO: User Guide

Here’s how to perform some of the most powerful edits in DreamCraft.

### How to Retouch an Image
1.  Upload an image. The **Retouch** tool is active by default.
2.  Click on the specific area(s) of the image you want to change. A marker will appear for each click.
3.  If you make a mistake, click the **"Undo Last Point"** button.
4.  In the right-hand panel, describe your edit (e.g., *"change the shirt to red"* or *"remove the stray hair"*).
5.  Click **Generate**.

### How to Batch-Apply a Frame
This is a powerful workflow for content creators.
1.  Upload a single image to start.
2.  Select the **Frame** tool from the left toolbar.
3.  Design your frame using the controls on the right (style, top text, bottom text).
4.  Click **"Pin Frame for Batch Use"**. The button will turn green.
5.  Select the **Batch** tool from the left toolbar.
6.  Click **"Select Images for Batch"** and choose all the photos you want to frame.
7.  Click **"Apply to All Images"**. The AI will process every image and add your pinned frame.

### How to Composite Two Images
1.  Select the **Composite** tool from the left toolbar.
2.  Click **"Select Images"** and choose two or more images.
3.  The images will appear in the main view. Click on the one you want to use as the **Style Source** (its lighting and mood will be applied to the others).
4.  Click **"Generate Composite"** in the right-hand panel.

### How to Download a Selection of Edits
1.  After making several edits, you will see a history of thumbnails at the bottom of the image.
2.  Hover over any thumbnail and click the circle in the top-right corner to select it for download.
3.  In the right-hand panel, under **Downloads**, click the **"Download Selected (X) as .zip"** button.