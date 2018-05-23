import * as moment from 'moment'

import { Router } from 'express'

import route from '../../../libs/route'

const router = Router({ mergeParams: true })

// 系統番号と時刻から時刻表を取得
router.get('/:routeNum/:date', (req, res) =>
  route(req.params.companyName, req.params.routeNum, moment(req.params.date))
    .then(stops => res.json(stops.map(stop => stop.id)))
    .catch(err => res.status(404).json({ error: { message: err.message } }))
)

export default router
