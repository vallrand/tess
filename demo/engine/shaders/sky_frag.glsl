#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vOrigin;
in vec3 vRay;
layout(location=0) out vec4 fragAlbedo;
layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragPosition;

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
uniform vec4 uFogColor;
uniform vec3 uSkyColor;

float hash31(vec3 uv){
    uvec3 q = floatBitsToUint(uv);
	q *= uvec3(1597334673U, 3812015801U, 2798796415U);
	uint n = (q.x ^ q.y ^ q.z) * 1597334673U;
	return float(n) * (1.0 / float(0xffffffffU));
}

float noise3D(in vec3 x){
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
	
    return mix(mix(mix( hash31(i+vec3(0,0,0)), 
                        hash31(i+vec3(1,0,0)),f.x),
                   mix( hash31(i+vec3(0,1,0)), 
                        hash31(i+vec3(1,1,0)),f.x),f.y),
               mix(mix( hash31(i+vec3(0,0,1)), 
                        hash31(i+vec3(1,0,1)),f.x),
                   mix( hash31(i+vec3(0,1,1)), 
                        hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p, int octaves, float scale, float offset){
    const mat3 m = mat3( 0.00,  0.80,  0.60,
              -0.80,  0.36, -0.48,
              -0.60, -0.48,  0.64 );
    float f = 0.0, a = 0.5, s = 0.0;
    for(int i = 0; i < octaves; ++i){
        s += a;
        f += a*abs(noise3D(p)*scale-offset);
        p = m*p*2.02;
        a *= 0.5;
    }
    return f/s;
}

vec3 sky(in vec3 ray){
    const vec3 sun = normalize(vec3(0,1,1));

    ray.y = max(ray.y, 0.);

    vec3 color = vec3(0);
    color += vec3(.2,.3,.4) * dot(ray,vec3(0,1,0));
    
    float f0 = fbm(ray * 10.0 + vec3(0,0,1)*uTime.x*0.1, 4,2.,1.);
    float f1 = fbm(ray * 8.0 + f0, 2,1.,0.);
    
    color += mix(vec3(0), vec3(1,0.4,0.6), f1 * f1 - 0.2 * f0) * ray.y;
    color += 2.0 * vec3(0.9,0.7,0.7) * pow(max(0.,dot(ray, sun)),8.);
    return color * color;
}

void main(){
    vec3 position = vOrigin + vRay;
    vec3 ray = normalize(vRay);
    gl_FragDepth = gl_DepthRange.far;
    fragPosition = vec4(position,uLayer);
    fragNormal = vec4(-ray*0.0,0.5);

    float rayDotUp = max(0.0,dot(vec3(0,1,0),ray));
    vec3 color = mix(uFogColor.rgb, sky(ray), rayDotUp);
    fragAlbedo = vec4(color,0.5);
}