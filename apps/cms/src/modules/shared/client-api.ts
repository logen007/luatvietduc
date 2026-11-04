"use client";
import {loadPublicSession,invalidatePublicSession} from './session-client';
import {loadPublicSettings} from '../settings/client';
export async function api<T=any>(path: string, data?: unknown):Promise<T> {
  if(path==='me'&&data===undefined)return loadPublicSession();
  if(path==='settings'&&data===undefined)return loadPublicSettings() as Promise<T>;
  let response: Response;
  try {
    response = await fetch("/service/" + path, {
      method: data ? "POST" : "GET",
      headers: data ? { "content-type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new Error("Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      result?.error || "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.",
    );
  if (result === null)
    throw new Error("Không thể đọc phản hồi của dịch vụ. Vui lòng thử lại.");
  if(path==='logout')invalidatePublicSession();
  return result;
}
