"use client";
import {loadPublicSession,invalidatePublicSession} from './session-client';
import {loadPublicSettings} from '../settings/client';
export class ClientApiError extends Error{
  constructor(message:string,public readonly status=0){super(message);this.name='ClientApiError';}
}
export async function api<T=any>(path: string, data?: unknown):Promise<T> {
  if(path==='me'&&data===undefined)return loadPublicSession() as Promise<T>;
  if(path==='settings'&&data===undefined)return loadPublicSettings() as Promise<T>;
  let response: Response;
  try {
    response = await fetch("/service/" + path, {
      method: data ? "POST" : "GET",
      headers: data ? { "content-type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
      cache: "no-store",
      signal:data?undefined:AbortSignal.timeout(15000),
    });
  } catch {
    throw new ClientApiError("Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok){
    if(response.status===401)invalidatePublicSession();
    throw new ClientApiError(
      result?.error || "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.",
      response.status,
    );
  }
  if (result === null)
    throw new ClientApiError("Không thể đọc phản hồi của dịch vụ. Vui lòng thử lại.",502);
  if(path==='logout')invalidatePublicSession();
  return result;
}
