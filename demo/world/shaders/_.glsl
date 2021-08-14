#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

vec2 hash22(uvec2 x){
    x = 1103515245U*((x >> 1U)^(x.yx));
    uint h32 = 1103515245U*((x.x)^(x.y>>3U));
    h32 = h32^(h32 >> 16);
    uvec2 rz = uvec2(h32, h32*48271U);
    return vec2((rz.xy >> 1) & uvec2(0x7fffffffU))/float(0x7fffffff);
}
vec2 hash22(ivec2 x){return 1.-2.*hash22(uvec2(x+0x7fffffff));}
float noise2D(in vec2 p){
    ivec2 i = ivec2(floor( p ));
    vec2 f =       fract( p );
	vec2 u = f*f*(3.0-2.0*f);
    return mix( mix( dot( hash22( i+ivec2(0,0) ), f-vec2(0.0,0.0) ), 
                     dot( hash22( i+ivec2(1,0) ), f-vec2(1.0,0.0) ), u.x),
                mix( dot( hash22( i+ivec2(0,1) ), f-vec2(0.0,1.0) ), 
                     dot( hash22( i+ivec2(1,1) ), f-vec2(1.0,1.0) ), u.x), u.y);
}
float fbm(in vec2 uv, in int octaves) {
    const mat2 m = mat2(1.6,  1.2, -1.2,  1.6);
	float total = 0.0, amplitude = 0.5;
	for(int i=0;i<octaves;i++){
		total += noise2D(uv) * amplitude;
		uv = m * uv;
		amplitude *= 0.5;
	}
	return total;
}

void main(){
    vec2 uv = vUV;

    float f0 = smoothstep(-0.5,1.0, fbm(uv * 4.0, 4));
    f0 *= smoothstep(1.0,0.5,length(2.*uv-1.));

	fragColor = vec4(1,1,1,f0);
}