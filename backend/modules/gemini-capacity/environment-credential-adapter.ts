import type { EnvironmentCredentialAdapter } from './gemini-capacity-types';

export class ProcessEnvironmentCredentialAdapter implements EnvironmentCredentialAdapter {
  constructor(private readonly environment: NodeJS.ProcessEnv = process.env) {}

  getCredential() {
    const credential = this.environment.GEMINI_API_KEY?.trim();
    return credential || null;
  }
}
