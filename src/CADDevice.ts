class CADDevice {

  private _activePowerReadings: number[];
  private _min: number = 50;
  private _max: number = 1000;
  private _variance: number = 20;
  private _changeRate: number = 0.3;
  private _current: number = 0;
  private _costPerKWHour:number = 0.12;


  private _updateInterval: NodeJS.Timeout;

  constructor() {
    console.log('CAD Devive intansiated');

    // Initialise dummy data
    this._current = this._getRandomStartPoint();
    this._activePowerReadings = this._createDummyData(8640);
    this._updateInterval = setInterval(this._sendCurrentReading.bind(this), 5000);
  }

  // A reading for every 10 seconds in num_Minutes
  getActivePower(numMinutes: number): number[] {
    const n: number = numMinutes * 6;
    const len: number = this._activePowerReadings.length;
    return this._activePowerReadings.slice(len - n, len);
  }

  _sendCurrentReading(): void {
    this._activePowerReadings.push(this._getRandomReading());
  }

  _createDummyData(numReadings: number): number[] {

    let rtn: number[] = [];
    // Pick a number between min and _max
    let current: number = this._getRandomStartPoint();

    for (var i: number = 0; i < numReadings; i++) {
      rtn.push(this._getRandomReading());
    }

    return rtn;
  }

  _getRandomStartPoint(): number {
    const dif: number = this._max - this._min;
    let rtn = this._min + Math.round(Math.random() * dif);
    return rtn;
  }

  _getRandomReading(): number {
    let current = this._current + (Math.round(Math.random() * this._variance));
    // Occasionally reset the current as though a device has gone on/off
    if (Math.random() < this._changeRate) {
      this._current = this._getRandomStartPoint();
    }
    return current;
  }

  // Cost for every 30 mins
  getActiveCost() : number[] {
    const rtn: number[] = []
    const arr = this._activePowerReadings.concat();
    console.log('active readings', arr);
    const readingsIn30Mins:number = 6 * 30;
    while(arr.length > 0) {
      const latestReadings: number[] = arr.splice(0, readingsIn30Mins);
      console.log('Latest Readings ', latestReadings);
      const cost30Mins = this._getAverageCost(latestReadings);
      rtn.push(cost30Mins)
    }

    return rtn;
  }


  _getAverageCost(arr: number[]) {
    let total = arr.reduce((previous: number = 0, reading: number) => {
      return previous + reading;
    });
    const div = total / arr.length;
    return div * (this._costPerKWHour / 2);
  }
}

export default CADDevice;