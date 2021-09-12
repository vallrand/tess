#version 300 es
precision highp float;

in vec3 vPosition;
in mat4 vInvModel;
in vec4 vUV;
in vec4 vColor;
in float vThreshold;

layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

uniform float uLayer;
uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;
uniform sampler2D uPositionBuffer;

#define TAU 6.283185307179586
float hash11(float u){
    uint q = floatBitsToUint(u);
	uvec2 n = q * uvec2(1597334673U, 3812015801U);
	q = (n.x ^ n.y) * 1597334673U;
	return float(q) * (1.0 / float(0xffffffffU));
}
vec2 hash22(in vec2 uv){
    uvec4 q = floatBitsToUint(uv).xyyx;
    q = 1103515245u * ((q >> 1u) ^ q.yxwz);
    uvec2 n = 1103515245u * (q.xz ^ (q.yw >> 3u));
    return vec2(n) * (1.0 / float(0xffffffffu));
}
float hash12(in vec2 src) {
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    uvec2 v = floatBitsToUint(src);    
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}
float noise1D(in float p, in float period){
    float i = floor(p);
    float f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(hash11(mod(i,period)), hash11(mod(i+1.,period)), f);
}
float noise2D(in vec2 p, in vec2 period){
    vec4 i = floor(p).xyxy + vec4(0,0,1,1);
    vec2 f = fract(p); f = f*f*(3.0-2.0*f);
    i = mod(i, period.xyxy);
    return mix( mix( hash12(i.xy), 
                     hash12(i.zy), f.x),
                mix( hash12(i.xw), 
                     hash12(i.zw), f.x), f.y);
}

vec3 voronoi(in vec2 x, in vec2 period, float seed){
    x *= period;
    vec2 n = floor( x );
    vec2 f = fract( x );

	vec3 m = vec3( 8.0 );
    for( int j=-1; j<=1; j++ )
    for( int i=-1; i<=1; i++ ){
        vec2  g = vec2( float(i), float(j) );
        vec2  o = hash22(mod(n + g, period));
        vec2  r = g - f + o;
		float d = dot( r, r );
        d += d*mix(-0.5,2.0,noise2D(o*period+0.5+seed, period));
        if( d<m.x ) m = vec3( d, o );
    }

    return vec3( sqrt(m.x),m.y,m.z);
}

float fbm(in vec2 x, in int octaves, in vec2 period) {
	float v = 0.0, a = 0.5, m = 0.0;
	vec2 shift = vec2(100);
    const mat2 rot = mat2(cos(0.4), sin(0.4), -sin(0.4), cos(0.4));
	for(int i = 0; i < octaves; ++i){
        m += a;
		v += a * noise2D(x * period, period);
        x += shift;
        shift = rot * shift;
		a *= 0.5;
        period *= 2.0;
	}
	return v/m;
}
vec3 saturation(vec3 rgb, float adjustment){
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    vec3 intensity = vec3(dot(rgb, W));
    return mix(intensity, rgb, adjustment);
}

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec3 viewRay = vPosition.xyz - uEyePosition;
    vec4 worldPosition = texelFetch(uPositionBuffer, fragCoord, 0);
    if(worldPosition.a > uLayer) discard;
    vec4 objectPosition = vInvModel * vec4(worldPosition.xyz, 1.0);
    if(0.5 < abs(objectPosition.x) || 0.5 < abs(objectPosition.y) || 0.5 < abs(objectPosition.z)) discard;
    vec2 uv = mix(vUV.xy, vUV.zw, objectPosition.xz + 0.5);
    ///vec4 color = vColor * texture(uDiffuseMap, uv);

    uv = uv*2.-1.;
    uv = vec2(atan(uv.y,uv.x)/TAU+.5,length(uv));
    
    float f0 = fbm(uv - .01*vec2(uTime.x,uTime.x), 2, vec2(10,4));
    f0 += smoothstep(0.4,.0,uv.y);
    f0 -= vThreshold;
    float f1 = fbm(uv + 0.5*f0 - vec2(uv.y - .1*uTime.x,0), 2, vec2(8,4));
    float f2 = fbm(uv + vec2(f1,f0), 2, vec2(12,6));
    f2 += smoothstep(0.4,.0,uv.y) + max(0.,f1-f0);
    
    f2 *= smoothstep(1.0,0.8,uv.y*(0.6+f1));

    vec4 color = vec4(0);
    color.rgb = mix(vec3(1.3,1.2,1.6), color.rgb, pow(smoothstep(.0,.9,f2),2.0));
    color.rgb += vec3(0.42,0.4,0.36) * pow(smoothstep(0., 1., f0*f2+f1*f0),2.0);
    color.rgb = mix(color.rgb, vec3(0.6,0,0.2)*f0, vThreshold);
    color.rgb *= pow(f1*f2*f0+f2, 2.0);    
    color.a = smoothstep(0.0,0.2,color.r);
    color *= smoothstep(1.0,0.5,uv.y);

#ifdef ALPHA_CUTOFF
    if(color.a < ALPHA_CUTOFF) discard;
#endif
    fragAlbedo = color;
    fragNormal = vec4(0,0,0, smoothstep(0.2,0.8,f2*f0));
}