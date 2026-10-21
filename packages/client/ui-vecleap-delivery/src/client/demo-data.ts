/** Demo fleet and trip data aligned with the standalone showcase page. */

export interface DemoProject {
  readonly name: string
  readonly mode: 'dynamic' | 'fixed_route'
  readonly park: string
}

export const DEMO_PROJECTS: Record<number, DemoProject> = {
  4: { name: '南京理工大学-钟山校区', mode: 'dynamic', park: '026223' },
  5: { name: '南京理工大学-江阴校区', mode: 'fixed_route', park: '031778' },
}

export interface DemoFleetVehicle {
  projectId: number
  vin: string
  code: string
  park: string
  enabled: boolean
  battery: number
  power: boolean
  fault: number
}

export interface DemoTrip {
  tripNo: string
  projectId: number
  vin: string
  from: string
  to: string
  status: string
  participants: number
}

export interface DemoQueueRow {
  orderNo: string
  from: string
  to: string
  count: number
  queueNo: number
  wait: number
}

export function initialFleet(): DemoFleetVehicle[] {
  return [
    { projectId: 4, vin: 'LHTDA4B48SYC6A073', code: 'X6S7673', park: '026223', enabled: true, battery: 78, power: true, fault: 0 },
    { projectId: 4, vin: 'LHTDA4B48SYC6A074', code: 'X6S7674', park: '026223', enabled: true, battery: 12, power: true, fault: 0 },
    { projectId: 5, vin: 'LHTDA4B48SYC6A080', code: 'JY-01', park: '031778', enabled: true, battery: 65, power: true, fault: 0 },
    { projectId: 5, vin: 'LHTDA4B48SYC6A081', code: 'JY-02', park: '031778', enabled: true, battery: 0, power: false, fault: 0 },
  ]
}

export function initialTrips(): DemoTrip[] {
  return [
    { tripNo: 'LT1787803930384', projectId: 5, vin: 'LHTDA4B48SYC6A080', from: '南门装货点', to: '宿舍5A/B', status: 'delivering', participants: 2 },
    { tripNo: 'LT1787803836141', projectId: 4, vin: 'LHTDA4B48SYC6A073', from: '2号停车点', to: '3号停车点', status: 'boarding', participants: 3 },
  ]
}

export function initialQueue(): DemoQueueRow[] {
  return [
    { orderNo: 'LG-QUEUE-001', from: '2号停车点', to: '5号停车点', count: 2, queueNo: 1, wait: 15 },
  ]
}

export type BoardVehicleState =
  | 'idle' | 'boarding' | 'delivering' | 'fault' | 'offline' | 'low_battery'

/** Map fleet row + optional trip to a board pill state. */
export function boardState(vehicle: DemoFleetVehicle, trip: DemoTrip | undefined): BoardVehicleState {
  if (vehicle.fault) return 'fault'
  if (vehicle.battery > 0 && vehicle.battery < 15) return 'low_battery'
  if (!vehicle.power) return 'offline'
  if (trip !== undefined && trip.status !== 'closed') return trip.status as BoardVehicleState
  return 'idle'
}
