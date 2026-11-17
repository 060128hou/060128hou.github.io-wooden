declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAILS?: string;
    AI_ENDPOINT?: string;
    AI_API_KEY?: string;
  }
}
