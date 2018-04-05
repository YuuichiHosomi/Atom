import * as util from 'util'
import { h24ToLessH24 } from './util'

import * as csvParse from 'csv-parse'

import * as _moment from 'moment'
import { extendMoment } from 'moment-range'

import { default as translations } from './gtfs_loader/translation'

import route from '../libs/route'
import direction from './direction'

import { IbusRaw, createBus } from './classes/create_bus'

import { Ierror } from '../interfaces'

export interface basumada {
  change: boolean
  buses: { [k: string]: createBus }
  date: _moment.Moment
  raw: string
}

const csvParser = util.promisify<string, csvParse.Options, IbusRaw[]>(csvParse),
  moment = extendMoment(_moment)

export async function rawToObject(
  rawData: string,
  comparisonRawData?: string,
  _date?: _moment.Moment
): Promise<basumada> {
  if (!/\/\/LAST/.test(rawData)) {
    const error: Ierror = new Error('Server side processing is not completed.')
    error.code = 202
    throw error
  }

  const date = _date ? _date : h24ToLessH24(rawData.substr(0, 8)),
    busesRaw: IbusRaw[] = await csvParser(rawData.substr(11), {
      columns: [
        'routeNum',
        'okayamaStopTime',
        'delay',
        'run',
        'passingStop',
        'licenseNumber',
        'lat',
        'lon',
        'firstStop',
        'finalStop'
      ],
      comment: '//'
    })

  const buses: { [k: string]: createBus } = {}

  for (const busRaw of busesRaw.filter(
    busRaw => (busRaw.passingStop.substr(13, 3) === '《着》' ? false : true)
  )) {
    const bus = new createBus(
      busRaw,
      await route(
        busRaw.routeNum,
        h24ToLessH24(busRaw.firstStop.substr(3, 5), date)
      ),
      {
        time: busRaw.passingStop.substr(6, 5),
        name: await translations.then(
          stops => stops[busRaw.passingStop.substr(13)]
        )
      },
      rawData.substr(0, 8)
    )

    buses[`${bus.routeNumber}_${bus.licenseNumber}`] = bus
  }

  return {
    change:
      comparisonRawData && comparisonRawData.substr(9) === rawData.substr(9)
        ? false
        : true,
    buses,
    date,
    raw: rawData
  }
}
