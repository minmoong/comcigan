import { AxiosAndCheck } from './utils';
import iconv from 'iconv-lite';
import type { SchoolData } from './types';

class Comcigan {
  isInitialized: boolean;
  comciganUrl: string;
  frameUrl: string;
  apiRequestUrl: string;
  requestCode: string;
  searchCode: string;

  constructor() {
    this.isInitialized = false;
    this.comciganUrl = 'http://컴시간학생.kr/';
    this.frameUrl = '';
    this.apiRequestUrl = '';
    this.requestCode = '';
    this.searchCode = '';
  }

  /**
   * 클래스를 초기화합니다.
   */
  async init() {
    // comcigan에서 HTML을 가져와 <frame> 태그의 src 속성에서 URL을 추출합니다.
    const comciganRes = await AxiosAndCheck(this.comciganUrl);
    const comciganHtml = comciganRes.data;
    const frameUrlMatch = comciganHtml.match(/<frame [^>]*src='([^']*)'[^>]*>/i);

    if (frameUrlMatch === null) {
      throw new Error('<frame> 태그의 src 속성에서 URL을 찾는 데 실패했습니다.');
    }

    this.frameUrl = frameUrlMatch[1];
    this.apiRequestUrl = new URL(this.frameUrl).origin;

    // frameUrl에서 HTML을 가져와 API 요청에 필요한 값을 추출합니다.
    const frameRes = await AxiosAndCheck(this.frameUrl, { responseType: 'arraybuffer' });
    const frameHtml = iconv.decode(Buffer.from(frameRes.data), 'EUC-KR');
    const searchCodeMatch = frameHtml.match(/function school_ra\(sc\).*url:'\.\/(.+?)'/i);

    if (searchCodeMatch === null) {
      throw new Error('frame HTML에서 API 요청에 필요한 값을 추출하는 데 실패했습니다.');
    }

    [this.requestCode, this.searchCode] = searchCodeMatch[1].split('?');

    this.isInitialized = true;
  }

  /**
   * 키워드로 학교를 검색하여 검색된 학교 목록을 반환합니다.
   * @param keyword - 학교 검색 키워드
   * @returns 검색된 학교들의 지역, 이름, 코드 리스트를 반환합니다.
   */
  async searchSchool(keyword: string): Promise<SchoolData[]> {
    this.checkIsInitialized();
    
    let encodedKeyword = '';

    for (let buf of iconv.encode(keyword, 'EUC-KR')) {
      encodedKeyword += '%' + buf.toString(16);
    }

    const reqUrl = `${this.apiRequestUrl}/${this.requestCode}?${this.searchCode}${encodedKeyword}`;
    const res = await AxiosAndCheck(reqUrl);
    const resText = res.data;
    const resJson = JSON.parse(resText.substring(0, resText.lastIndexOf('}') + 1));
    const searchResult = resJson['학교검색'];

    if (searchResult.length === 0) {
      throw new Error('학교 검색 결과가 없습니다. 하지만 학교가 존재한다면 해당 학교가 컴시간 시스템을 사용하지 않는 것일 수 있습니다.');
    }

    return searchResult.map((schoolData: Array<string | number>) => {
      return {
        resType: schoolData[0],
        region: schoolData[1],
        schoolName: schoolData[2],
        schoolCode: schoolData[3]
      };
    });
  }

  /**
   * 클래스가 초기화되었는지 확인합니다. 초기화되지 않았다면 오류를 발생합니다.
   */
  checkIsInitialized() {
    if (!this.isInitialized) {
      throw new Error('클래스 초기화가 진행되지 않았습니다.');
    }
  }
}


(async () => {
  try {
    const comcigan = new Comcigan();
    await comcigan.init();
    const searchResult = await comcigan.searchSchool('서대전고');
    console.log(searchResult);
  } catch (error) {
    console.error(error);
  }
})();

export default Comcigan;
