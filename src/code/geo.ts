import type { WLatLng } from "./model/portal";
import type WasabeePortal from "./model/portal";

// from iitc rework : https://github.com/IITC-CE/ingress-intel-total-conversion/pull/333
const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;

type Vec3 = [number, number, number];
interface LLC extends WLatLng {
  _cartesian?: Vec3;
}

function toCartesian(lat: number, lng: number): Vec3 {
  lat *= d2r;
  lng *= d2r;
  const o = Math.cos(lat);
  return [o * Math.cos(lng), o * Math.sin(lng), Math.sin(lat)];
}

export function toLatLng(xyz: Vec3): LLC {
  const lat = Math.atan2(xyz[2], Math.sqrt(xyz[0] * xyz[0] + xyz[1] * xyz[1]));
  const lng = Math.atan2(xyz[1], xyz[0]);

  const ll: LLC = L.latLng({ lat: lat * r2d, lng: lng * r2d });
  ll._cartesian = [...xyz];
  return ll;
}

function cross(t: Vec3, n: Vec3): Vec3 {
  return [
    t[1] * n[2] - t[2] * n[1],
    t[2] * n[0] - t[0] * n[2],
    t[0] * n[1] - t[1] * n[0],
  ];
}

function dot(t: Vec3, n: Vec3) {
  return t[0] * n[0] + t[1] * n[1] + t[2] * n[2];
}

function det(a: Vec3, b: Vec3, c: Vec3) {
  return dot(cross(a, b), c);
}

function norm2(a: Vec3) {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

function norm(a: Vec3) {
  return Math.hypot(...a);
}

// where is the fast inverse square root when we need it ?
export function normalize(a: Vec3): Vec3 {
  const n = 1 / norm(a);
  return [a[0] * n, a[1] * n, a[2] * n];
}

export function dist2(a: Vec3, b: Vec3) {
  return norm2([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

function equals(a: WLatLng, b: WLatLng) {
  return a.lat === b.lat && a.lng === b.lng;
}

// take L.LatLng
// note: cache cos/sin calls in the object, in order to be efficient, try using same LatLng objects across calls, like using latLng from WasabeePortal attached to an op

export function extendLatLngToLLC(ll: LLC) {
  if (ll._cartesian) return ll;
  ll._cartesian = toCartesian(ll.lat, ll.lng);
  return ll;
}

export function fieldSign(
  a: WasabeePortal,
  b: WasabeePortal,
  c: WasabeePortal
) {
  const ca = extendLatLngToLLC(a.latLng)._cartesian;
  const cb = extendLatLngToLLC(b.latLng)._cartesian;
  const cc = extendLatLngToLLC(c.latLng)._cartesian;
  if (det(ca, cb, cc) > 0) return 1;
  return -1;
}

export function portalInField(
  a: WasabeePortal,
  b: WasabeePortal,
  c: WasabeePortal,
  portal: WasabeePortal
) {
  const sign = fieldSign(a, b, c);
  return (
    fieldSign(a, b, portal) * sign > 0 &&
    fieldSign(b, c, portal) * sign > 0 &&
    fieldSign(c, a, portal) * sign > 0
  );
}

export function fieldCenter(
  a: WasabeePortal,
  b: WasabeePortal,
  c: WasabeePortal
) {
  const ca = extendLatLngToLLC(a.latLng)._cartesian;
  const cb = extendLatLngToLLC(b.latLng)._cartesian;
  const cc = extendLatLngToLLC(c.latLng)._cartesian;
  const ccenter: Vec3 = [
    ca[0] + cb[0] + cc[0],
    ca[1] + cb[1] + cc[1],
    ca[2] + cb[2] + cc[2],
  ];
  return toLatLng(ccenter);
}

export function greatCircleArcIntersectByLatLngs(a0: LLC[], a1: LLC[]): boolean;
export function greatCircleArcIntersectByLatLngs(
  a0: LLC,
  a1: LLC,
  b0: LLC,
  b1: LLC
): boolean;
export function greatCircleArcIntersectByLatLngs(...args: (LLC | LLC[])[]) {
  const [a0, a1, b0, b1] = args.flat();
  // 0) quick checks
  // zero length line
  if (equals(a0, a1)) return false;
  if (equals(b0, b1)) return false;

  // lines have a common point
  if (equals(a0, b0) || equals(a0, b1)) return false;
  if (equals(a1, b0) || equals(a1, b1)) return false;

  // check for 'horizontal' overlap in longitude
  if (Math.min(a0.lng, a1.lng) > Math.max(b0.lng, b1.lng)) return false;
  if (Math.max(a0.lng, a1.lng) < Math.min(b0.lng, b1.lng)) return false;

  // a) convert into 3D coordinates on a unit sphere & cache into latLng object
  const ca0 = extendLatLngToLLC(a0)._cartesian;
  const ca1 = extendLatLngToLLC(a1)._cartesian;
  const cb0 = extendLatLngToLLC(b0)._cartesian;
  const cb1 = extendLatLngToLLC(b1)._cartesian;

  // b) two planes: ca0,ca1,0/0/0 and cb0,cb1,0/0/0
  // find the intersetion line

  // b1) build plane normals for
  const da = cross(ca0, ca1);
  const db = cross(cb0, cb1);

  // prepare for d) build 90° rotated vectors
  const da0 = cross(da, ca0);
  const da1 = cross(da, ca1);
  const db0 = cross(db, cb0);
  const db1 = cross(db, cb1);

  // b2) intersetion line
  const p = cross(da, db);

  // c) special case when both planes are equal
  // = both lines are on the same greatarc. test if they overlap
  const len2 = p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
  if (len2 < 1e-30) {
    /* === 0 */ // b0 inside a0-a1 ?
    const s1 = dot(cb0, da0);
    const d1 = dot(cb0, da1);
    if ((s1 < 0 && d1 > 0) || (s1 > 0 && d1 < 0)) return true;
    // b1 inside a0-a1 ?
    const s2 = dot(cb1, da0);
    const d2 = dot(cb1, da1);
    if ((s2 < 0 && d2 > 0) || (s2 > 0 && d2 < 0)) return true;
    // a inside b0-b1 ?
    const s3 = dot(ca0, db0);
    const d3 = dot(ca0, db1);
    if ((s3 < 0 && d3 > 0) || (s3 > 0 && d3 < 0)) return true;
    return false;
  }

  // d) at this point we have two possible collision points
  //    p or -p  (in 3D space)

  // e) angel to point
  //    since da,db is rotated: dot<0 => left, dot>0 => right of P
  const s = dot(p, da0);
  const d = dot(p, da1);
  const l = dot(p, db0);
  const f = dot(p, db1);

  // is on side a (P)
  if (s > 0 && 0 > d && l > 0 && 0 > f) {
    return true;
  }

  // is on side b (-P)
  if (0 > s && d > 0 && 0 > l && f > 0) {
    return true;
  }

  return false;
}

export class GeodesicLine {
  lat1: number;
  lat2: number;
  lng1: number;
  lng2: number;
  sinLat1CosLat2: number;
  sinLat2CosLat1: number;
  cosLat1CosLat2SinDLng: number;

  constructor(start: WLatLng, end: WLatLng) {
    const d2r = Math.PI / 180.0;
    // let r2d = 180.0 / Math.PI; //eslint-disable-line
    // maths based on http://williams.best.vwh.net/avform.htm#Int
    if (start.lng == end.lng) {
      throw new Error("Error: cannot calculate latitude for meridians");
    }
    // only the variables needed to calculate a latitude for a given longitude are stored in 'this'
    this.lat1 = start.lat * d2r;
    this.lat2 = end.lat * d2r;
    this.lng1 = start.lng * d2r;
    this.lng2 = end.lng * d2r;
    const dLng = this.lng1 - this.lng2;
    const sinLat1 = Math.sin(this.lat1);
    const sinLat2 = Math.sin(this.lat2);
    const cosLat1 = Math.cos(this.lat1);
    const cosLat2 = Math.cos(this.lat2);
    this.sinLat1CosLat2 = sinLat1 * cosLat2;
    this.sinLat2CosLat1 = sinLat2 * cosLat1;
    this.cosLat1CosLat2SinDLng = cosLat1 * cosLat2 * Math.sin(dLng);
  }

  isMeridian() {
    return this.lng1 == this.lng2;
  }

  latAtLng(lng: number) {
    lng = (lng * Math.PI) / 180; //to radians
    let lat: number;
    // if we're testing the start/end point, return that directly rather than calculating
    // 1. this may be fractionally faster, no complex maths
    // 2. there's odd rounding issues that occur on some browsers (noticed on IITC MObile) for very short links - this may help
    if (lng == this.lng1) {
      lat = this.lat1;
    } else if (lng == this.lng2) {
      lat = this.lat2;
    } else {
      lat = Math.atan(
        (this.sinLat1CosLat2 * Math.sin(lng - this.lng2) -
          this.sinLat2CosLat1 * Math.sin(lng - this.lng1)) /
          this.cosLat1CosLat2SinDLng
      );
    }
    return (lat * 180) / Math.PI; // return value in degrees
  }

  // bearing in radians
  bearing() {
    const dLng = this.lng1 - this.lng2;
    const cosLat2 = Math.cos(this.lat2);
    const y = Math.sin(dLng) * cosLat2;
    const x = this.sinLat2CosLat1 - this.sinLat1CosLat2 * Math.cos(dLng);
    return Math.atan2(y, x);
  }
}
