[![npm version](https://badge.fury.io/js/comcigan.svg)](https://badge.fury.io/js/comcigan)
![TypeScript](https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF)
[![npm license](https://img.shields.io/npm/l/comcigan)](LICENSE)

## comcigan - 컴시간 데이터 추출 라이브러리

> **v3.0.0 부터 선생님 시간표 파싱 기능이 추가되었습니다.**

**❤️ 해당 문서의 오탈자나 오류가 있다면 이슈 올려주시면 감사하겠습니다.**

## 주의 사항
**컴시간 서비스에 등록된, 컴시간 서비스를 사용하는 학교만 데이터 추출이 가능합니다.**

## 설치

```
npm install --save comcigan
```

## 사용법

### 모듈 불러오기 및 객체 생성

```typescript
import { Comcigan, ComciganTeacher } from 'comcigan';

const comcigan = new Comcigan();
const comciganTeacher = new ComciganTeacher(학교코드); // 학교코드는 comcigan 객체 searchSchool 함수를 통해 얻을 수 있습니다.
```

### 함수 소개

### `async Comcigan.init()`, `async ComciganTeacher.init()`

객체를 초기화합니다.

> 객체를 생성한 직후 바로 실행하여 초기화를 진행해야 합니다.

```typescript
import { Comcigan, ComciganTeacher } from 'comcigan';

const comcigan = new Comcigan();
const comciganTeacher = new ComciganTeacher(학교코드);

comcigan.init().then(() => {
  // 초기화가 완료되면 계속 진행합니다.
  // ...
});

comciganTeacher.init().then(() => {
  // ...
});
```

### `async Comcigan.searchSchool(keyword)`

키워드로 학교를 검색하여 검색된 학교 목록을 반환합니다.

```typescript
import { Comcigan } from 'comcigan';

const comcigan = new Comcigan();

comcigan
  .init()
  .then(() => {
    comcigan.searchSchool('서대').then(console.log);
  })
  .catch(console.error);

// 출력
// [
//   {
//     resType: 24966,
//     region: '대구',
//     schoolName: '서대구중학교',
//     schoolCode: 29878,
//   },
//   {
//     resType: 24966,
//     region: '대전',
//     schoolName: '서대전고등학교',
//     schoolCode: 71433,
//   },
// ];
```

### `Comcigan.setSchoolCode(schoolCode)`

학교 코드를 설정합니다.

> 위의 `Comcigan.searchSchool()` 함수에서 추출한 schoolCode 값을 인자로 전달합니다.

```typescript
import { Comcigan } from 'comcigan';

const comcigan = new Comcigan();

comcigan
  .init()
  .then(() => {
    comcigan.setSchoolCode(71433);
  })
  .catch(console.error);
```

### `async Comcigan.getTimetable()`

전체 학년 및 반의 시간표 정보를 반환합니다.

> 위의 `Comcigan.setSchoolCode(schoolCode)` 함수를 통해 학교 코드가 설정돼 있어야 합니다.

```typescript
import { Comcigan } from 'comcigan';

const comcigan = new Comcigan();

comcigan
  .init()
  .then(() => {
    comcigan.setSchoolCode(71433);
    comcigan.getTimetable().then(console.log);
  })
  .catch(console.error);

// 출력
// {
//   '1': {                     // 1학년
//     '1': {                   // 1반
//       '1': {                 // 월요일 (1: 월요일 ~ 5: 금요일)
//         '1': {               // 1교시 (1교시 ~ 8교시)
//           grd: 1,            // 학년
//           cls: 1,            // 반
//           weekday: 1,        // 요일 (1: 월요일 ~ 5: 금요일)
//           period: 1,         // 교시
//           teacher: '',       // 선생님 성함 (앞 두 글자)
//           subject: '',       // 과목 이름
//           classroom: '',     // 강의실 이름
//           changed: false,    // 시간표 변경됨 여부
//           code: ''           // 동시그룹코드 (이 값이 어떤 의미인지는 몰라요. 필요하면 쓰세요.)
//         },
//         // ...
//       },
//       // ...
//     },
//     // ...
//   },
//   '2': {
//     // 2학년
//   },
//   '3': {
//     // 3학년
//   }
// }
```

시간표 데이터를 얻고 나서 원하는 정보에 접근하는 방법은 다음과 같습니다.

`timetable[학년][반][요일][교시]`

### `async ComciganTeacher.getTimetable()`

선생님들의 시간표와 선생님 성함이 담긴 배열(teacherIndex)을 반환합니다.

```typescript
import { ComciganTeacher } from 'comcigan';

const comciganTeacher = new ComciganTeacher(71433);

comciganTeacher
  .init()
  .then(() => {
    comciganTeacher.getTimetable().then(console.log);
  })
  .catch(console.error);

// 출력
{
  teacherIndex: [
    '*',     '김은*', '신순*', '이장*', '백민*',
    '김종*', '이승*', '오인*', '전고*', '최재*',
    '곽휘*', '임재*', '이기*', '정태*', '박상*',
    '강상*', '윤희*', '김효*', '노영*', '박종*',
    '전순*', '채소*', '이규*', '유민*', '이규*',
    '김바*', '임남*', '장선*', '조나*', '김승*',
    '김중*', '박형*', '김혜*', '백지*', '강민*',
    '김형*', '백순*', '손승*', '김대*', '손거*',
    '강정*', '오칠*', '서수*', '민병*', '김진*',
    '김한*', '오동*', '이우*', '이경*', '유정*',
    '박성*', '이규*', '김관*', '이재*', '이미*',
    '김진*', '강윤*', '김용*', '서성*', '창체*'
  ],
  timetable: {
    '1': {                 // 선생님 성함: teacherIndex[1]의 시간표 데이터
      '1': {               // 월요일 (1: 월요일 ~ 5: 금요일)
        changed: false,    // 시간표 변경됨 여부
        cls: 104,          // 학급 (1학년 4반)
        subject: '국어A'   // 과목
      },
      // ...
    },
    '2': {
      // 선생님 성함: teacherIndex[2]의 시간표 데이터
      // ...
    },
    '3': {
      // 선생님 성함: teacherIndex[3]의 시간표 데이터
      // ...
    },
    // ...
  }
}
```

시간표 데이터를 얻고 나서 원하는 정보에 접근하는 방법은 다음과 같습니다.

`timetable[선생님 인덱스][요일][교시]`

## 예시

```typescript
import { Comcigan, ComciganTeacher } from 'comcigan';

const comcigan = new Comcigan();
const comciganTeacher = new ComciganTeacher(71433);

try {
  // Comcigan
  await comcigan.init();
  const school = await comcigan.searchSchool('서대전고등학교');
  comcigan.setSchoolCode(school[0].schoolCode);
  const timetable = await comcigan.getTimetable();
  console.log(timetable[1][6][2][6]); // 1학년 6반의 화요일 6교시

  // ComciganTeacher
  await comciganTeacher.init();
  const { timetable, teacherIndex } = await comciganTeacher.getTimetable();
  console.log(teacherIndex[1]); // 쌤 성함
  console.log(timetable[1][1][2]); // teacherIndex[1] 쌤의 월요일 2교시
} catch (err) {
  console.error(err);
}

// 출력
// {
//   grd: 1,
//   cls: 6,
//   weekday: 2,
//   period: 6,
//   teacher: '신순',
//   subject: '국어A',
//   classroom: '',
//   changed: false,
//   code: ''
// }
// 김은*
// { changed: false, cls: 104, subject: '국어A' }
```

## 참조

[comcigan-parser](https://github.com/leegeunhyeok/comcigan-parser) (leegeunhyeok)
