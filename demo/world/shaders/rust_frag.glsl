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
float rfbm(vec2 uv, vec2 frequency, int octaves, float seed){
    uv *= frequency;
    float value = 0.0, amplitude = 0.5;
    for(int i=0;i<octaves;i++){
        float r = noise21(uv / frequency, frequency, seed)*2.-1.;
        value += amplitude * abs(r);
        uv += r;
        uv = uv * 2.0 + vec2(100) * float(i+1);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

uvec2 wrap2(in vec2 v, float period){return uvec2(v-period*floor(v/period));}
float hash21(in uvec2 v){
    uint n = v.x*1597334677U^v.y*3812015801U;
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & uvec3(0x7fffffffU))/float(0x7fffffff);
}
float noise2D(in vec2 p, in float period){
    const vec2 e = vec2(0,1);
    vec2 f = fract(p);
    p = floor(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash21(wrap2(p+e.xx, period)),
				    hash21(wrap2(p+e.yx, period)), f.x),
				mix(hash21(wrap2(p+e.xy, period)),
					hash21(wrap2(p+e.yy, period)), f.x), f.y);
}
float fbm(in vec2 uv, in float period, in int octaves){
    float value=0.0,amplitude=0.5;
    for(int i=0;i<octaves;i++){
        value += noise2D(uv, period) * amplitude;
        amplitude*=0.5;
        period*=2.0;
        uv*=2.0;
    }
    return value;
}
vec3 saturation(vec3 rgb, float adjustment){
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    vec3 intensity = vec3(dot(rgb, W));
    return mix(intensity, rgb, adjustment);
}

void main(){
#if defined(RUST)
    vec2 uv = vUV.yx;
    float scale = 1.0;
	float f0 = fbm(uv*8.0*scale, 8.0*scale, 4);
    uv.x -= f0*0.5;
    float f1 = fbm(uv*16.0*scale + 128.0, 16.0*scale, 2);
    uv -= f0*f1;
    float f2 = fbm(uv*12.*scale + 256.0, 12.*scale, 4);
    
    vec3 color = vec3(0.4,0.3,0.3);
    color = mix(color, vec3(0.8,0.3,0.3), f0);
    color = mix(color, vec3(0.4,0.5,0.4), f1);
    color = mix(color, vec3(0.2,0.1,0.2), smoothstep(0.2,1.,f2));
	
    float roughness = 1.0-f1*f2;
	fragColor = vec4(color,.5*roughness);
#elif defined(PIPE)
    vec2 uv = vUV;

    float f0 = 1.-2.*fbm(uv, vec2(8,12), 2, 0.0, 0.5, 2.0, 0.9, 0.);
    float f1 = .4+.6*rfbm(uv.yx + .6*f0, vec2(8,16), 6, 0.5);
    
    vec3 color = vec3(f1*f1*f1,f1*f1*(f1+0.5),f1*(f1+0.5));
    color -= vec3(f1*abs(f0));
    float roughness = mix(0.8, 0.4, color.r);
    color = mix(vec3(1.0,0.85,0.95)-color.bgr, color.ggb, color.b*color.g);

    fragColor = vec4(color,.5*roughness);
#else
    vec2 uv = vUV;

    float f0 = fbm(uv, vec2(4,8), 6, 0., 0.5, 2.0, 0.8, 0.);
    uv += vec2(1,0.2) * f0;
    float f1 = fbm(uv, vec2(4), 2, 100., 0.3, 1.4, 0.8, 0.);
    
    vec3 color = vec3(0.06,0,0.08);
    color += vec3(0.8*f1*f1,f1*f1,0.7*f1);
    color += 0.8 * vec3(f0*f0,f0*f1*f0,f0*f1);
	
    float roughness = mix(0.8, 0.4, smoothstep(0.2,0.5,f1*f0));
	fragColor = vec4(color,.5*roughness);
#endif
}