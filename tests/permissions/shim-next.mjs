export class NextResponse {
  constructor(body, init = {}) { this._body = body; this.status = init.status ?? 200; this.headers = new Map(Object.entries(init.headers || {})); }
  static json(data, init = {}) { const r = new NextResponse(JSON.stringify(data), init); r.data = data; return r; }
  static redirect(u, s = 307) { return new NextResponse(null, { status: s }); }
  async json() { return this.data ?? JSON.parse(this._body); }
}
export class NextRequest extends Request { get nextUrl() { return new URL(this.url); } }
