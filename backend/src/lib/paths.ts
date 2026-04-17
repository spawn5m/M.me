import path from 'path'

// __dirname is backend/src/lib in dev and backend/dist/lib in prod.
// ../../../ reaches the workspace root regardless of PM2 cwd.
export const UPLOADS_ROOT =
  process.env.UPLOADS_PATH ?? path.resolve(__dirname, '../../../uploads')
