export class RepositoryApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "RepositoryApiError";
  }
}
