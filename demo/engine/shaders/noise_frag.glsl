#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define TAU 6.283185307179586
float hash21(in vec2 uv){
    uvec2 q = floatBitsToUint(uv);
    q = 1103515245u * ((q >> 1u) ^ q.yx);
    uint n = 1103515245u * (q.x ^ (q.y >> 3u));
    return float(n) * (1.0 / float(0xffffffffu));
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

void main(){
    vec2 uv = vUV;

#if defined(SINE)
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
    float f0 = fbm(uv, vec2(4.0), 7, 23.0, 0.5, 2.0, 0.95, 0.0);
    float alpha = smoothstep(0.2, 1.0, f0);
#endif
	fragColor = vec4(alpha);
}