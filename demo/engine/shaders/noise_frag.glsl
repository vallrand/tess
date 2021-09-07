#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define TAU 6.283185307179586
float hash11(in float u){
    uint n = floatBitsToUint(u);
    n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & 0x7fffffffU)/float(0x7fffffff);
}
float hash21(in vec2 uv){
    uvec2 q = floatBitsToUint(uv);
    q = 1103515245u * ((q >> 1u) ^ q.yx);
    uint n = 1103515245u * (q.x ^ (q.y >> 3u));
    return float(n) * (1.0 / float(0xffffffffu));
}
vec2 hash22(in vec2 uv){
    uvec4 q = floatBitsToUint(uv).xyyx;
    q = 1103515245u * ((q >> 1u) ^ q.yxwz);
    uvec2 n = 1103515245u * (q.xz ^ (q.yw >> 3u));
    return vec2(n) * (1.0 / float(0xffffffffu));
}
float noise11(in float u, in float period, float seed){
    u *= period;
    vec2 i = mod(floor(vec2(u,u+1.0)),vec2(period))+seed;
    float f = fract(u);
    return mix(hash11(i.x),hash11(i.y),f);
}
float noise21(in vec2 uv, in vec2 period, float seed){
    uv *= period;
    vec4 i = mod(floor(uv).xyxy+vec2(0,1).xxyy,period.xyxy)+seed;
    vec2 f = fract(uv); f = f*f*f*(f*(f*6.0-15.0)+10.0);
    return mix(mix(hash21(i.xy), 
                   hash21(i.zy), f.x),
               mix(hash21(i.xw), 
                   hash21(i.zw), f.x), f.y);
}
vec3 noise21d(in vec2 uv, in vec2 period, float seed){
    uv *= period;
    vec4 i = mod(floor(uv).xyxy+vec2(0,1).xxyy,period.xyxy)+seed;
    vec2 u = fract(uv);
    vec2 du = 30.0 * u * u * (u * (u - 2.0) + 1.0);
    u = u*u*u*(u*(u*6.0-15.0)+10.0);
    float a = hash21(i.xy);
    float b = hash21(i.zy);
    float c = hash21(i.xw);
    float d = hash21(i.zw);
    float abcd = a - b - c + d;
    float value = a + (b - a) * u.x + (c - a) * u.y + abcd * u.x * u.y;
    vec2 derivative = du.xy * (u.yx * abcd + vec2(b, c) - a);
    return vec3(value * 2.0 - 1.0, derivative);
}

float fbm(vec2 uv, vec2 frequency, int octaves, float shift, float gain, float lacunarity, float factor, float seed){
    uv *= frequency;
    vec2 offset = vec2(shift,0);
    float value = 0.0, amplitude = gain;
    vec2 sc = vec2(sin(shift), cos(shift)); mat2 rotate = mat2(sc.y,sc.x,-sc.x,sc.y);
    for(int i=0;i<octaves;i++){
        value += amplitude * (noise21(uv / frequency, frequency, seed)*2.-1.);
        uv = uv * lacunarity + offset * float(i+1);
        frequency *= lacunarity;
        amplitude = pow(amplitude * gain, factor);
        offset *= rotate;
    }
    return .5+.5*value;
}
vec3 fbmd(vec2 uv, vec2 frequency, int octaves, vec2 shift, float gain, vec2 lacunarity, float slopeness, float factor, float seed){
    uv *= frequency;
    vec3 value = vec3(0); vec2 derivative = vec2(0); float amplitude = gain;
    vec2 sc = vec2(sin(shift.x),cos(shift.y)); mat2 rotate = mat2(sc.y,sc.x,-sc.x,sc.y);
    for(int i=0;i<octaves;i++){
        vec3 n = noise21d(uv / frequency, frequency, seed).xyz;
        derivative += n.yz;

        n *= amplitude;
        n.x /= (1.0 + mix(0.0, dot(derivative, derivative), slopeness));
        value += n; 
        
        uv = (uv + shift) * lacunarity;
        frequency *= lacunarity;
        amplitude = pow(amplitude * gain, factor);
        shift *= rotate;
    }
    value.x = value.x * 0.5 + 0.5;
    return value;
}
vec4 voronoi(in vec2 uv, in vec2 period, in float jitter, in float width, in float seed){
    uv *= period;
    vec2 i = floor(uv); vec2 f = uv - i;
    vec2 minPos, tilePos;
    float md = 1e+5;
    for(int y=-1;y<=1;y++)
    for(int x=-1;x<=1;x++){
        vec2 n = vec2(x,y);
        vec2 cPos = jitter * hash22(mod(i + n, period) + seed);
        vec2 rPos = n + cPos - f;
        float d = dot(rPos, rPos);
        if(d >= md) continue;
        md = d;
        minPos = rPos;
        tilePos = cPos;
    }
    float md0 = 1e+5, md1 = 1e+5;
    for(int y=-2;y<=2;y++)
    for(int x=-2;x<=2;x++){
        vec2 n = vec2(x,y);
        vec2 cPos = jitter * hash22(mod(i + n, period) + seed);
        vec2 rPos = n + cPos - f;
        vec2 v = minPos - rPos;
        if(dot(v, v) <= 1e-5) continue;
        float d = dot(0.5 * (minPos + rPos), normalize(rPos - minPos));
        if(d < md0){
            md1 = md0; md0 = d;
        }else if(d < md1){
            md1 = d;
        }
    }
    md0 += (md1 - md0) * width;
    return vec4(md0, md, tilePos);
}

vec4 rectangularNoise(in vec2 uv, in vec2 period){
    uv *= period;
    vec2 i = floor(uv);
    vec2 f = uv - i;
    vec2 c = vec2(0);
    int o = int(i.x+i.y) & 1;
    int u = o ^ 1;
    bool s = f[o]>hash21(mod(i,period));
    if(s) c[o] = 1.;
    vec2 n = i;
    n[o] += s ? 1. : -1.;
    if(f[u]>hash21(mod(n,period))) c[u] = 1.;
    c = i+c;

    vec4 d = vec4(
        hash21(mod(c + vec2(-1,-1), period)), 
        hash21(mod(c + vec2( 0,-1), period)), 
        hash21(mod(c + vec2( 0, 0), period)), 
    	hash21(mod(c + vec2(-1, 0), period))
    );
    o = int(c.x+c.y) & 1;
    if(o==1) d = d.wxyz;
    d = d + vec4(c-1.,c);
    vec2 mi = d.xy;
    vec2 ma = d.zw;
    return vec4(uv-mi, uv-ma);
}

float sineNoise(vec2 uv, int layers, float shift){
    vec2 p = vec2(uv); float v = 0.0;
	for(int i=0;i<layers;i++){
		float t = shift * (.75+.25*sin(float(i+1)*43758.5453));
        uv.y -= t;
		p = uv + vec2(cos(t - p.x) + sin(t + p.y), sin(t - p.y) + cos(t + p.x));
        v += 1.0/length(1.0/vec2(sin(p.x+t), cos(p.y+t)));
	}
    v = smoothstep(1.0,0.0,v / float(layers));
    return pow(v,1.4);
}

uniform vec4 uColor;

void main(){
    vec2 uv = vUV;
#ifdef SKEW
    uv = vec2(uv.x+uv.y,uv.x-uv.y);
#endif
#if defined(CELLULAR)
    vec4 w = voronoi(uv, vec2(8), 1.0, 0.0, 0.0);
    float alpha = 1.0-(1.0-1.5*w.y);
#elif defined(VORONOI)
    vec4 w = voronoi(uv, vec2(8), 1.0, 0.0, 0.0);
    float alpha = smoothstep(0.8,-0.2,w.x);
#elif defined(RECTANGULAR)
    vec4 minmax = rectangularNoise(uv, vec2(8));
    float alpha = min(min(abs(minmax.x), abs(minmax.y)), min(abs(minmax.z),abs(minmax.w)));
#elif defined(SINE)
    float alpha = sineNoise(uv*TAU, 8, 411.37);
    alpha = smoothstep(0.2,1.0,alpha);
#elif defined(WARP)
    const float gain = 0.5, slopeness = 0.5, factor = 0.94, seed = 0.0;
    const vec2 lacunarity = vec2(2), frequency = vec2(8.0);

    float f0 = fbmd(uv, frequency, 7, vec2(123), gain, lacunarity, slopeness, factor, seed).x;
    float f1 = fbmd(uv, frequency, 7, vec2(235), gain, lacunarity, slopeness, factor, seed).x;
    uv = uv + 0.2 * vec2(f0, f1);
    float alpha = fbmd(uv, frequency, 7, vec2(0.0), gain, lacunarity, slopeness, factor, seed).x;
#else
    float f0 = fbm(uv, vec2(8.0), 7, 23.0, 0.5, 2.0, 0.95, 0.0);
    float alpha = smoothstep(0.2, 1.0, f0);
#endif
	fragColor = uColor * vec4(alpha);
}