import { AxiosAndCheck } from './utils';
import iconv from 'iconv-lite';
import type { SchoolData, Timetable } from './types';

class Comcigan {
  private isInitialized: boolean;
  private comciganUrl: string;
  private frameUrl: string;
  private apiRequestUrl: string;
  private requestCode: string;
  private searchCode: string;
  private scData: string[];
  private schoolCode: number;

  constructor() {
    this.isInitialized = false;
    this.comciganUrl = 'http://컴시간학생.kr/';
    this.frameUrl = '';
    this.apiRequestUrl = '';
    this.requestCode = '';
    this.searchCode = '';
    this.scData = [];
    this.schoolCode = -1;
  }

  /**
   * 학교 코드를 설정합니다.
   *
   * @param schoolCode - 학교 코드
   */
  setSchoolCode(schoolCode: number) {
    this.schoolCode = schoolCode;
  }

  /**
   * 클래스를 초기화합니다.
   */
  async init() {
    // comcigan에서 HTML을 가져와 <frame> 태그의 src 속성에서 URL을 추출합니다.
    const comciganRes = await AxiosAndCheck(this.comciganUrl);
    const comciganHtml = comciganRes.data;
    const frameUrlMatch = comciganHtml.match(
      /<frame [^>]*src='([^']*)'[^>]*>/i
    );

    if (frameUrlMatch === null) {
      throw new Error(
        '<frame> 태그의 src 속성에서 URL을 찾는 데 실패했습니다.'
      );
    }

    this.frameUrl = frameUrlMatch[1];
    this.apiRequestUrl = new URL(this.frameUrl).origin;

    // frameUrl에서 HTML을 가져와 학교 검색 API 요청에 필요한 값을 추출합니다.
    const frameRes = await AxiosAndCheck(this.frameUrl, {
      responseType: 'arraybuffer',
    });
    const frameHtml = iconv.decode(Buffer.from(frameRes.data), 'EUC-KR');
    const searchCodeMatch = frameHtml.match(
      /function school_ra\(sc\).*url:'\.\/(.+?)'/i
    );

    if (searchCodeMatch === null) {
      throw new Error(
        'frame HTML에서 학교 검색 API 요청에 필요한 값을 추출하는 데 실패했습니다.'
      );
    }

    [this.requestCode, this.searchCode] = searchCodeMatch[1].split('?');

    // frameHtml에서 시간표 API 요청에 필요한 값을 추출합니다.
    const scDataMatch = frameHtml.match(
      /function sc_disp\(sc\).*sc_data\((.*?)\)/
    );

    if (scDataMatch === null) {
      throw new Error(
        'frame HTML에서 시간표 API 요청에 필요한 값을 추출하는 데 실패했습니다.'
      );
    }

    this.scData = scDataMatch[1].replace(/'/g, '').split(',');

    this.isInitialized = true;
  }

  /**
   * 키워드로 학교를 검색하여 검색된 학교 목록을 반환합니다.
   *
   * @param keyword - 학교 검색 키워드
   * @returns 검색된 학교들의 지역, 이름, 코드 리스트를 반환합니다.
   */
  async searchSchool(keyword: string): Promise<SchoolData[]> {
    if (!this.isInitialized) {
      throw new Error('클래스 초기화가 진행되지 않았습니다.');
    }

    if (keyword === '') {
      throw new Error('검색어를 입력해 주세요.');
    }

    let encodedKeyword = '';
    for (let buf of iconv.encode(keyword, 'EUC-KR')) {
      encodedKeyword += '%' + buf.toString(16);
    }
    const reqUrl = `${this.apiRequestUrl}/${this.requestCode}?${this.searchCode}${encodedKeyword}`;

    const res = await AxiosAndCheck(reqUrl);
    const resText = res.data;
    const resJson = JSON.parse(
      resText.substring(0, resText.lastIndexOf('}') + 1)
    );
    const searchResult = resJson['학교검색'];

    if (searchResult.length === 0) {
      throw new Error(
        '학교 검색 결과가 없습니다. 하지만 학교가 존재한다면 해당 학교가 컴시간 시스템을 사용하지 않는 것일 수 있습니다.'
      );
    }

    return searchResult.map((schoolData: Array<string | number>) => {
      return {
        resType: schoolData[0],
        region: schoolData[1],
        schoolName: schoolData[2],
        schoolCode: schoolData[3],
      };
    });
  }

  /**
   * 컴시간 시간표를 파싱하여 리턴합니다.
   *
   * @returns 전체 학년 및 반의 시간표 데이터
   */
  async getTimetable(): Promise<Timetable> {
    this.checkIsReady();

    const encodedParam = Buffer.from(
      `${this.scData[0]}${this.schoolCode}_0_${this.scData[2]}`
    ).toString('base64');
    const reqUrl = `${this.apiRequestUrl}/${this.requestCode}?${encodedParam}`;

    const res = await AxiosAndCheck(reqUrl);
    const resText = res.data;
    const resJson = JSON.parse(
      resText.substring(0, resText.lastIndexOf('}') + 1)
    );

    const timetable = this.parseTimetable(resJson);

    return timetable;
  }

  /**
   * 시간표 API로 얻은 데이터에서 시간표를 파싱합니다.
   *
   * @param data - 응답된 전체 시간표 데이터
   */
  private parseTimetable(data: any): Timetable {
    let timetable: Timetable = {};

    for (let grd = 1; grd <= 3; grd++) {
      for (
        let cls = 1;
        cls <= data['학급수'][grd] - data['가상학급수'][grd];
        cls++
      ) {
        for (let weekday = 1; weekday < 6; weekday++) {
          for (let period = 1; period <= 8; period++) {
            let v1 = data['자료481'][grd][cls][weekday][period] ?? 0;
            let v2 = data['자료147'][grd][cls][weekday][period] ?? 0;

            // 강의실 데이터를 추출합니다.
            let classroom: any = '';
            if (data['강의실'] === 1) {
              classroom = data['자료245'][grd][cls][weekday][period];
              if (classroom <= 0) classroom = '';
            }

            // 시간표 변경 여부를 추출합니다.
            let changed: boolean = false;
            if (v1 !== v2) changed = true;

            // 선생님의 성함과 과목을 추출합니다.
            let th = Math.floor(v2 / 100);
            let sb = v2 - th * 100;
            let teacher = '';
            let subject = '';
            if (v2 > 100) {
              if (th < data['자료446'].length) {
                teacher = data['자료446'][th].substr(0, 2);
              }
              subject = data['자료492'][sb];
            }

            // 동시그룹코드(?)를 추출합니다.
            let code = '';
            let geop,
              neon2,
              ban2,
              gwa2,
              geo,
              gwa3,
              ck,
              n2,
              flg = 0;
            if (!Array.isArray(data['동시그룹'])) {
              code = '';
            } else {
              for (let i = 1; i <= data['동시그룹'][0][0]; i++) {
                for (let j = 1; j <= data['동시그룹'][i][0]; j++) {
                  gwa2 = Math.floor(data['동시그룹'][i][j] / 1000);
                  geop = data['동시그룹'][i][j] - gwa2 * 1000;
                  neon2 = Math.floor(geop / 100);
                  ban2 = geop - neon2 * 100;
                  geo = Math.floor(
                    data['자료481'][neon2][ban2][weekday][period] / 100
                  );
                  gwa3 =
                    data['자료481'][neon2][ban2][weekday][period] - geo * 100;
                  if (!(gwa2 == gwa3)) {
                    ck = 0;
                    break;
                  }
                  if (grd == neon2 && cls == ban2 && sb == gwa2) {
                    ck = 1;
                  }
                }
                if (ck == 1) {
                  if (i > 26) {
                    n2 = i + 70;
                  } else {
                    n2 = i + 64;
                  }
                  code = String.fromCharCode(n2) + '_';
                  flg = 1;
                  break;
                }
              }
              if (!flg) code = '';
            }

            timetable[grd] = timetable[grd] ?? {};
            timetable[grd][cls] = timetable[grd][cls] ?? {};
            timetable[grd][cls][weekday] = timetable[grd][cls][weekday] ?? {};

            timetable[grd][cls][weekday][period] = {
              grd,
              cls,
              weekday,
              period,
              teacher,
              subject,
              classroom,
              changed,
              code,
            };
          }
        }
      }
    }

    return timetable;
  }

  /**
   * 클래스 초기화 및 학교 코드가 설정되었는지 확인합니다.
   */
  private checkIsReady() {
    if (!this.isInitialized) {
      throw new Error('클래스 초기화가 진행되지 않았습니다.');
    }

    if (this.schoolCode === -1) {
      throw new Error('학교 코드가 설정되지 않았습니다.');
    }
  }
}

export default Comcigan;
