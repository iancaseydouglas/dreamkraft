/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This file contains global type declarations for the project.

/**
 * Defines the structure of the environment variables object that is
 * injected into the `window` object at runtime, typically by a Docker
 * entrypoint script.
 */
interface InjectedEnv {
  API_KEY: string;
}

/**
 * Extends the global `Window` interface to include our custom `injectedEnv` property,
 * making it accessible in a type-safe way throughout the application.
 */
interface Window {
  injectedEnv?: InjectedEnv;
}

// Fix: Add global type for `process.env` to align with Gemini API guidelines
// for API key handling, making `process.env.API_KEY` available to TypeScript.
// This resolves TS errors and supports the required refactoring.
declare namespace NodeJS {
    interface ProcessEnv {
        API_KEY: string;
    }
}
