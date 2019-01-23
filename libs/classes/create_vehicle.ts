import * as createHttpError from 'http-errors'
import * as moment from 'moment'

import { BroadcastBusStop, BroadcastLocation, Stop } from '../../interfaces'
import { getTranslations, GtfsStopTime } from '../gtfs/static'
import { getRoutesStops, RouteStop } from '../route'
import stations from '../station_loader'
import { locationToBroadcastLocation } from '../util'

export class Vehicle {
  private _startDate: moment.Moment
  private _isRun: boolean // 運休の場合false
  private _delay: number | null = null
  private _descriptors: {
    // https://developers.google.com/transit/gtfs-realtime/reference/?hl=ja#message_vehicledescriptor
    id?: string
    label?: string
    licensePlate?: string
  } = {}
  private _stations: Stop[]
  private _route: {
    id: string // 系統番号
    stops: RouteStop[] // 路線
  }
  private _location: {
    lat: number // 緯度(y)
    lon: number // 経度(x)
  } | null = null
  private _passed: BroadcastBusStop<true> | null = null
  private _nextIndex: number | null = null

  constructor(
    private _companyName: string,
    route: {
      id: string
      stops: RouteStop[]
    },
    stations: string[],
    vehicle?: {
      descriptors?: {
        id?: string
        label?: string
        licensePlate?: string
      }
      delay: number
      location: { lat: number; lon: number }
      currentStop: {
        sequence: GtfsStopTime['stop_sequence']
        passingDate?: moment.Moment
      }
    }
  ) {
    this._startDate = moment(route.stops[0].date.schedule)

    if (vehicle === undefined) {
      this._isRun = false
      this._route = route
      this._stations = route.stops.filter(stop => stations.includes(stop.id))

      return
    }

    this._isRun = true
    this._delay = vehicle.delay
    this._route = route
    this._location = vehicle.location
    this._stations = route.stops.filter(stop => stations.includes(stop.id))
    this._descriptors = vehicle.descriptors || {}

    const passedIndex = route.stops.findIndex(
      stop => stop.sequence === vehicle.currentStop.sequence
    )
    this._passed = Object.assign<
      {},
      RouteStop,
      {
        location: BroadcastLocation
        date: BroadcastBusStop<true>['date']
      }
    >({}, route.stops[passedIndex], {
      location: locationToBroadcastLocation(route.stops[passedIndex].location),
      date: {
        ...route.stops[passedIndex].date,
        passed: vehicle.currentStop.passingDate
          ? vehicle.currentStop.passingDate.format()
          : moment(route.stops[passedIndex].date.schedule)
              .add(vehicle.delay, 's')
              .format()
      }
    })
    this._nextIndex = passedIndex + 1
  }

  get companyName() {
    return this._companyName
  }
  get isRun(): boolean {
    return this._isRun
  }

  get id(): string | null {
    return this._descriptors.id || null
  }

  get label(): string | null {
    return this._descriptors.label || null
  }

  get licensePlate(): string | null {
    return this._descriptors.licensePlate || null
  }

  get delay(): number | null {
    return this._delay
  }

  get location(): {
    lat: number
    lon: number
  } | null {
    return this._location
  }

  get stations(): Stop[] {
    return this._stations
  }

  get startDate(): moment.Moment {
    return this._startDate
  }

  get routeId(): string {
    return this._route.id
  }

  get route(): RouteStop[] {
    return this._route.stops
  }

  get firstStop(): RouteStop {
    return this._route.stops[0]
  }

  get passedStop(): BroadcastBusStop<true> | null {
    return this._passed
  }

  get nextStop(): RouteStop | null {
    return (this._nextIndex && this._route.stops[this._nextIndex]) || null
  }

  get lastStop(): RouteStop {
    return this._route.stops[this._route.stops.length - 1]
  }
}

export async function createVehicle(
  companyName: string,
  routeId: string,
  firstStopTime: moment.Moment,
  vehicle?: {
    secondsDelay: number
    location: {
      lat: number
      lon: number
    }
    currentStop: {
      sequence: GtfsStopTime['stop_sequence'] | string
      passedDate?: moment.Moment
    }
    descriptors?: {
      id?: string
      label?: string
      licensePlate?: string
    }
  }
): Promise<Vehicle> {
  const route = await getRoutesStops(companyName, routeId, firstStopTime)

  if (vehicle === undefined)
    return new Vehicle(
      companyName,
      {
        id: routeId,
        stops: route[0]
      },
      (await stations())[companyName]
    )

  const currentStopSequence =
    typeof vehicle.currentStop.sequence === 'string'
      ? await getTranslations().then(data =>
          route[0].find(
            ({ name }) => name.ja === data[companyName][vehicle.currentStop.sequence].ja
          )
        )
      : vehicle.currentStop.sequence

  if (!currentStopSequence) throw createHttpError(404, 'Current stop sequence not found.')

  return new Vehicle(
    companyName,

    {
      id: routeId,
      stops: route[0]
    },
    (await stations())[companyName],
    {
      delay: vehicle.secondsDelay,
      descriptors: vehicle.descriptors,
      location: vehicle.location,
      currentStop: {
        sequence:
          typeof currentStopSequence === 'number'
            ? currentStopSequence
            : currentStopSequence.sequence,
        passingDate: vehicle.currentStop.passedDate
      }
    }
  )
}