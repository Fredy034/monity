import { NextResponse } from 'next/server';

export function jsonError(status: number, error: string, message: string, nextActions?: string) {
  return NextResponse.json(
    {
      error,
      message,
      statusCode: status,
      ...(nextActions ? { nextActions } : {}),
    },
    { status },
  );
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('Invalid JSON body');
  }
}
