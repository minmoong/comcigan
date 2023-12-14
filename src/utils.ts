import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

async function AxiosAndCheck(url: string, config?: AxiosRequestConfig) {
  try {
    const res = await axios.get(url, config);
    return res;
  } catch (error) {
    console.error(error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        `${error.config?.url}: Axios HTTP 요청에 실패하였습니다.`
      );
    }
    throw error;
  }
}

export { AxiosAndCheck };
