#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

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

void main(){
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
}