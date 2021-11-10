#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define TAU 6.283185307179586

uvec2 wrap2(in vec2 v, in vec2 period){return uvec2(v-period*floor(v/period));}
float hash21(in uvec2 v){
    uint n = v.x*1597334677U^v.y*3812015801U;
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & uvec3(0x7fffffffU))/float(0x7fffffff);
}
float noise2D(in vec2 p, in vec2 period){
    const vec2 e = vec2(0,1);
    vec2 f = fract(p);
    p = floor(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash21(wrap2(p+e.xx, period)),
				    hash21(wrap2(p+e.yx, period)), f.x),
				mix(hash21(wrap2(p+e.xy, period)),
					hash21(wrap2(p+e.yy, period)), f.x), f.y);
}
float hatch(in vec2 uv, in float period, in int strength){
    float rz=1.,st=float(strength)*0.1;
    const vec2 s = vec2(1,20);
    for(int i=0;i<=strength;i++){
        uv.x += uv.y;
        float g = noise2D(s*uv,s*period);
        g = smoothstep(0.5,1.0,g);
        rz = rz+g; //min(1.-g,rz);
        uv.xy = uv.yx;
        uv += 128.767;
    }
    return rz;
}

uniform vec3 uColor;
uniform float uScale;

void main(){
    vec2 uv = vUV.yx;

    float h = hatch(uv*uScale,uScale,3);
    vec3 color = vec3(0.6,0.62,0.66);
    color += vec3(0.16,0.18,0.20) * smoothstep(0.0,3.0,h);
    color += vec3(0.1) * smoothstep(1.0,3.0,h);
    color += vec3(0.2) * smoothstep(2.0,3.0,h);
    
    color += 0.1*(cos(2.0*TAU*uv.y));
    color *= uColor;
    	
    float roughness = mix(0.2,0.8,color.b);
	fragColor = vec4(color,.5*roughness);
}