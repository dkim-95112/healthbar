const moment = require('moment')
const $scope = {}

const seg = {}
seg.unit = "weeks"
seg.count = 3
$scope.segPercentage = 100 / seg.count

$scope.segments = []
let startDate, endDate
if (seg.unit === "days") {
  startDate = moment().startOf('d').subtract(seg.count - 1, 'd')
  endDate = moment().endOf('d')
} else {
  startDate = moment().startOf('w').subtract(seg.count - 1, 'w')
  endDate = moment().endOf('w')
}
console.log(`startDate: ${startDate.toString()}`)
console.log(`endDate: ${endDate.toString()}`)
for (let i = 0; i < seg.count; i++) {
  $scope.segments.push({
    intervals: [{
      start: startDate.clone().add(i, seg.unit === "days" ? 'd' : 'w')
    }],
  })
}

const resp = {
  "data": {
    "cableModem": {
      "lastKnownStatus": "ONLINE",
      "events": [
        {
          "timestamp": "2019-11-04T17:35:17.000Z",
          "value": "OFFLINE"
        },
        {
          "timestamp": "2019-11-04T23:32:46.000Z",
          "value": "ONLINE"
        },
        {
          "timestamp": "2019-11-23T23:44:54.000Z",
          "value": "OFFLINE"
        },
        {
          "timestamp": "2019-11-24T00:00:03.000Z",
          "value": "ONLINE"
        },
        {
          "timestamp": "2019-11-26T20:30:06.000Z",
          "value": "OFFLINE"
        },
        {
          "timestamp": "2019-11-30T19:30:04.000Z",
          "value": "ONLINE"
        }
      ]
    }
  },
  "extensions": {}
}

function getStatus(targetMoment) {
  const events = resp.data.cableModem.events
  let lastKnownStatus = resp.data.cableModem.lastKnownStatus
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (moment(event.timestamp).isAfter(targetMoment)) {
      return lastKnownStatus
    }
    lastKnownStatus = event.value
  }
  return lastKnownStatus
}

resp.data.cableModem.events.forEach(event => {
  pushEvent(event, $scope.segments)
})
pushEvent({
  timestamp: moment().toISOString(),
  value: 'NONE' // The future
}, $scope.segments)

function pushEvent(event, segments) {
  const newInterval = {
    start: moment(event.timestamp),
    value: event.value,
  }
  for (let i = 0; i < segments.length; i++) {
    const intervals = segments[i].intervals
    for (let j = 0; j < intervals.length; j++) {
      const interval = intervals[j]
      if (interval.start.isAfter(newInterval.start)) {
        if (j >= 1) {
          // Splicing in
          segments[i].intervals.splice(j - 1, newInterval)
        } else {
          if (i >= 1) {
            // Or push at end of previous segment
            segments[i - 1].intervals.push(newInterval)
          }
        }
        return
      }
    }
  }
  // Reached end, so push at end
  segments[segments.length - 1].intervals.push(newInterval)
}

// Computing interval widths
seg.duration = moment.duration(1, seg.unit === 'days' ? 'd' : 'w').subtract(moment.duration(1))
let previousStart = startDate.clone().add(seg.count, seg.unit === 'days' ? 'd' : 'w')
for (let i = $scope.segments.length - 1; i >= 0; i--) { // Going back in time
  console.log(`seg ${i}`)
  const intervals = $scope.segments[i].intervals
  for (let j = intervals.length - 1; j >= 0; j--) {
    const interval = intervals[j]
    interval.end = previousStart.subtract(moment.duration(1))
    console.log(`ivl ${j}: ${interval.start.toString()} - ${interval.end.toString()}`)
    interval.percentage = 100 * interval.end.diff(interval.start) / seg.duration.asMilliseconds()
    previousStart = interval.start.clone()
  }
}
// Filling in left (for absolute positioning)
$scope.segments.forEach(seg => {
  let leftPct = 0;
  seg.intervals.forEach(interval => {
    interval.leftPct = leftPct
    leftPct += interval.percentage
  })
})
// Filling in status
let nextStatus = getStatus(startDate)
$scope.segments.forEach(seg => {
  seg.intervals.forEach(interval => {
    if (interval.value) {
      nextStatus = interval.value // Set status from event
    }
    interval.status = nextStatus
  })
})

debugger