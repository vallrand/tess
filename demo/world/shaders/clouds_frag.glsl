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