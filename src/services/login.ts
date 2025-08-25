import { wxLogin } from "./checkin.ts";
import { type IDType } from "@/services/checkin";
import { getOpenidFromStorage, saveOpenidToStorage } from "@/utils/video";
const isExpired = (expires: string) => {
  const now = new Date();
  const expireTime = new Date(expires);

  return new Date(now.getTime() + 3000) > expireTime; //三秒后过期
};
export const login = async (): Promise<IDType> => {
  return new Promise((resolve, reject) => {
    const id: IDType | null = getOpenidFromStorage();
    if (id && !isExpired(id.token.expires)) {
      // saveOpenidToStorage(id);
      resolve(id);
    } else {
      wxLogin()
        .then((res) => {
          saveOpenidToStorage(res.data);
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }
  });
};
