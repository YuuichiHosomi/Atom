import * as GTFS from '@come25136/gtfs'
import * as moment from 'moment-timezone'
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { Remote } from './remote'
import { Trip } from './trip'

@Entity()
export class Frequency extends BaseEntity {
  @ManyToOne(
    () => Remote,
    ({ frequencies }) => frequencies,
    { onDelete: 'CASCADE' }
  )
  remote: Remote

  @PrimaryGeneratedColumn()
  readonly uid: number

  @ManyToOne(
    () => Trip,
    ({ frequencies }) => frequencies
  )
  trip: Trip

  @Column('date', {
    nullable: true,
    transformer: {
      from: v => (v === null ? null : moment.utc(v, 'HH:mm:ss')),
      to: (v: moment.Moment) => (moment.isMoment(v) ? new Date(v.clone().utc().format('YYYY-MM-DD HH:mm:ss')) : v)
    }
  })
  startTime: GTFS.Frequency['time']['start'] = null

  @Column('date', {
    nullable: true,
    transformer: {
      from: v => (v === null ? null : moment.utc(v, 'HH:mm:ss')),
      to: (v: moment.Moment) => (moment.isMoment(v) ? new Date(v.clone().utc().format('YYYY-MM-DD HH:mm:ss')) : v)
    }
  })
  endTime: GTFS.Frequency['time']['end'] = null

  @Column('int')
  headwaySecs: GTFS.Frequency['headwaySecs']

  @Column('tinyint', { default: 0 })
  exactTimes: GTFS.Frequency['exactTimes'] = 0
}
