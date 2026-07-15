import { NextResponse } from 'next/server';
import {
  UserAccessAdministrationError,
  UserAccessAdministrationRepositoryError,
} from '@/backend/modules/user-access-administration/user-access-administration-errors';

export function userAccessErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof UserAccessAdministrationError) {
    return NextResponse.json({ error: error.clientMessage }, { status: error.status });
  }
  if (error instanceof UserAccessAdministrationRepositoryError) {
    console.error('[UserAccessAdministration] Repository failure', {
      operation: error.operation,
      error: error.cause,
    });
  } else {
    console.error('[UserAccessAdministration] Unexpected failure', error);
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
