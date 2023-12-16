import { AxiosAndCheck } from './utils';
import iconv from 'iconv-lite';

class ComciganTeacher {
  private isInitialized: boolean;
  private tComciganUrl: string;
  private tFrameUrl: string;
  private tApiRequestUrl: string;
  private tRequestCode: string;
  private tScData: string[];
  private schoolCode: number;

  constructor(schoolCode: number) {
    this.isInitialized = false;
    this.tComciganUrl = 'http://컴시간교사.kr/';
    this.tFrameUrl = '';
    this.tApiRequestUrl = '';
    this.tRequestCode = '';
    this.tScData = [];
    this.schoolCode = schoolCode;
  }

  async init() {
    const tComciganRes = await AxiosAndCheck(this.tComciganUrl);
    const tComciganHtml = tComciganRes.data;
    const tFrameUrlMatch = tComciganHtml.match(
      /<frame [^>]*src='([^']*)'[^>]*>/i
    );

    if (tFrameUrlMatch === null) {
      throw new Error(
        '<frame> 태그의 src 속성에서 URL을 찾는 데 실패했습니다.'
      );
    }

    this.tFrameUrl = tFrameUrlMatch[1];
    this.tApiRequestUrl = new URL(this.tFrameUrl).origin;

    const tFrameRes = await AxiosAndCheck(this.tFrameUrl, {
      responseType: 'arraybuffer',
    });
    const tFrameHtml = iconv.decode(Buffer.from(tFrameRes.data), 'EUC-KR');
    const tRequestCodeMatch = tFrameHtml.match(
      /function sc_data.*?'\.\/(.*?)\?'/
    );
    const tScDataMatch = tFrameHtml.match(
      /function scode_change\(\).*sc_data\((.*?)\)/
    );

    if (tScDataMatch === null || tRequestCodeMatch === null) {
      throw new Error(
        'frame HTML에서 시간표 API 요청에 필요한 값을 추출하는 데 실패했습니다.'
      );
    }

    this.tRequestCode = tRequestCodeMatch[1];
    this.tScData = tScDataMatch[1].replace(/'/g, '').split(',');

    this.isInitialized = true;
  }

  async getTimetable() {
    this.checkIsReady();

    const encodedParam = Buffer.from(
      `${this.tScData[0]}${this.schoolCode}_0_${this.tScData[2]}`
    ).toString('base64');
    const reqUrl = `${this.tApiRequestUrl}/${this.tRequestCode}?${encodedParam}`;

    const res = await AxiosAndCheck(reqUrl);
    const resText = res.data;
    const resJson = JSON.parse(
      resText.substring(0, resText.lastIndexOf('}') + 1)
    );

    return this.parseTimetable(resJson);
  }

  private parseTimetable(data: any) {
    function mTh(mm: number, m2: number) {
      if (m2 == 100) {
        return Math.floor(mm / m2);
      }
      return mm % m2;
    }
    function mSb(mm: number, m2: number) {
      if (m2 == 100) {
        return mm % m2;
      }
      return Math.floor(mm / m2);
    }
    function 교사시간표_원자료생성(자료: any) {
      var 분리, sb;
      if (자료.분리 == undefined) {
        분리 = 100;
      } else {
        분리 = 자료.분리;
      }
      자료.시간표2 = [];
      for (var 교사 = 1; 교사 <= 자료.교사수; 교사++) {
        자료.시간표2[교사] = [];
        for (var 요일 = 1; 요일 < 6; 요일++) {
          자료.시간표2[교사][요일] = [];
          for (var 교시 = 1; 교시 <= 8; 교시++) {
            자료.시간표2[교사][요일][교시] = 0;
          }
        }
      }
      for (var 학년 = 1; 학년 <= 3; 학년++) {
        for (var 반 = 1; 반 <= 자료.학급수[학년]; 반++) {
          for (var 요일 = 1; 요일 < 6; 요일++) {
            for (var 교시 = 1; 교시 <= 8; 교시++) {
              var 원자료 = 자료.자료481[학년][반][요일][교시] ?? 0;
              var 교사2 = 0;
              if (원자료 > 0) {
                교사 = mTh(원자료, 분리);
                if (교사 <= 자료.교사수) {
                  sb = mSb(원자료, 분리);
                  if (분리 == 100) {
                    자료.시간표2[교사][요일][교시] =
                      (학년 * 100 + 반) * 분리 + sb;
                    if (교사2 > 0)
                      자료.시간표2[교사2][요일][교시] =
                        (학년 * 100 + 반) * 분리 + sb;
                  } else {
                    자료.시간표2[교사][요일][교시] =
                      sb * 분리 + 학년 * 100 + 반;
                    if (교사2 > 0)
                      자료.시간표2[교사2][요일][교시] =
                        sb * 분리 + 학년 * 100 + 반;
                  }
                }
              }
            }
          }
        }
      }
    }

    교사시간표_원자료생성(data);

    let timetable: any = {};
    let changed: boolean;

    for (let 교사 = 1; 교사 <= data['교사수']; 교사++) {
      let 분리, 원자료, 교사자료;
      분리 = data['분리'] ?? 100;
      for (let 요일 = 1; 요일 < 6; 요일++) {
        for (let 교시 = 1; 교시 <= 8; 교시++) {
          let sb: any, cls;
          교사자료 = data['자료542'][교사][요일][교시] ?? 0;
          원자료 = data['시간표2'][교사][요일][교시] ?? 0;

          if (원자료 == 교사자료) {
            changed = false;
          } else {
            changed = true;
          }

          if (교사자료 > 100) {
            if (분리 == 100) {
              cls = mTh(교사자료, 분리);
              sb = mSb(교사자료, 분리);
              sb %= 분리;
            } else {
              cls = mTh(교사자료, 분리);
              sb = mSb(교사자료, 분리);
              sb %= 분리;
            }
          }

          let subject = data['자료492'][sb];

          timetable[교사] = timetable[교사] ?? {};
          timetable[교사][요일] = timetable[교사][요일] ?? {};

          timetable[교사][요일][교시] = {
            changed,
            cls: cls ?? undefined,
            subject: subject ?? undefined,
          };
        }
      }
    }

    return { teacherTimetable: timetable, teacherIndex: data['자료446'] };
  }

  private checkIsReady() {
    if (!this.isInitialized) {
      throw new Error('클래스 초기화가 진행되지 않았습니다.');
    }
  }
}

export default ComciganTeacher;
