interface SchoolData {
  resType: number;
  region: string;
  schoolName: string;
  schoolCode: number;
}

interface Timetable {
  [grd: number]: {
    [cls: number]: {
      [weekday: number]: {
        [period: number]: {
          grd: number;
          cls: number;
          weekday: number;
          period: number;
          teacher: string;
          subject: string;
          classroom: string;
          changed: boolean;
          code: string;
        };
      };
    };
  };
}

export { SchoolData, Timetable };
