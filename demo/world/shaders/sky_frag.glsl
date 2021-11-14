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

#pragma import(../../engine/shaders/common/hash.glsl)
#pragma import(../../engine/shaders/common/noise.glsl)
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
    const vec3 sun = normalize(vec3(0,1,0.5));

    ray.y = max(ray.y, 0.);

    vec3 color = vec3(0);
    color += vec3(.4,.1,.3) * dot(ray,vec3(0,1,0));
    
    float f0 = fbm(ray * 10.0 + vec3(0,0,1)*uTime.x*0.1, 4,2.,1.);
    float f1 = fbm(ray * 8.0 + f0, 2,1.,0.);
    
    color += vec3(1.0,0.8,0.8) * (f1 * f1 - 0.2 * f0) * ray.y;
    color += vec3(1.4,1.2,1.0) * pow(max(0.,dot(ray, sun)),16.);
    return color * color;
}

void main(){
    vec3 position = vOrigin + vRay;
    vec3 ray = normalize(vRay);
    gl_FragDepth = gl_DepthRange.far;
    fragPosition = vec4(position - uEyePosition,uLayer);
    fragNormal = vec4(-ray*0.0,0);

    float rayDotUp = max(0.0,dot(vec3(0,1,0),ray));
    vec3 color = mix(uFogColor.rgb, sky(ray), rayDotUp);
    fragAlbedo = vec4(color,0.5);
}