#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aTransform;
layout(location=1) in vec4 aVelocity;
layout(location=2) in vec4 aAcceleration;
layout(location=3) in vec3 aLifetime;
layout(location=4) in vec2 aSize;

layout(xfb_offset=0) out vec4 vTransform;
layout(xfb_offset=0) out vec4 vVelocity;
layout(xfb_offset=0) out vec4 vAcceleration;
layout(xfb_offset=0) out vec3 vLifetime;
layout(xfb_offset=0) out vec2 vSize;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform EmitterUniforms {
    vec4 uOrigin;
    vec4 uLifespan;
    vec2 uSize;
    vec2 uRadius;
    vec2 uForce;
    vec3 uTarget;
    vec3 uGravity;
    float uTrailLength;
    int uLastID;
};

#define TAU 6.283185307179586
float hash(uvec2 x){
    uvec2 q = 1103515245U * ( (x>>1U) ^ (x.yx   ));
    uint  n = 1103515245U * ( (q.x  ) ^ (q.y>>3U));
    return float(n) * (1.0/float(0xffffffffU));
}

void main(){
    uvec2 seed = uvec2(gl_VertexID,1000.*uTime.x);

    if(gl_VertexID >= uLastID){
#if defined(SPHERE)
        vec3 random = vec3(hash(seed), hash(seed*16807U), hash(seed*48271U));
        float theta = TAU * random.x;
        float phi = acos(2. * random.y - 1.);
        float radius = mix(uRadius.x, uRadius.y, random.z);
        vec3 normal = vec3(sin(phi) * cos(theta), sin(phi) * sin(theta), cos(phi));
        vTransform.xyz = uOrigin.xyz + radius * normal;
#endif
        vTransform.w = uTrailLength;

        vec3 direction = normalize(vTransform.xyz - uTarget);
        vAcceleration.xyz = uGravity;
        vAcceleration.w = 0.0;
        vVelocity.xyz = direction * mix(uForce.x, uForce.y, hash(seed+=1U));
        vVelocity.w = 0.0;
        vLifetime.x = uTime.x - mix(uLifespan.z, uLifespan.w, hash(seed+=1U));
        vLifetime.y = mix(uLifespan.x, uLifespan.y, hash(seed+=1U));
        vLifetime.z = random.x;
        vSize.x = mix(uSize.x, uSize.y, hash(seed+=1U));
        vSize.y = 0.0;
    }else{
        vLifetime = aLifetime;
        vAcceleration = aAcceleration;
        vVelocity = aVelocity;
        vTransform = aTransform;
        vSize = aSize;
    }
}