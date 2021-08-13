#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aTransform;
layout(location=1) in vec4 aVelocity;
layout(location=2) in vec4 aAcceleration;
layout(location=3) in vec2 aLifetime;
layout(location=4) in vec2 aSize;

layout(xfb_offset=0) out vec4 vTransform;
layout(xfb_offset=0) out vec4 vVelocity;
layout(xfb_offset=0) out vec4 vAcceleration;
layout(xfb_offset=0) out vec2 vLifetime;
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
        vec3 random = vec3(hash(seed), hash(seed*16807U), hash(seed*48271U));
        float angle = TAU * hash(seed*13U);
        float radius = mix(uRadius.x, uRadius.y, hash(seed*16807U));
        vec3 position = uOrigin.xyz + radius * vec3(cos(angle), 0, sin(angle));
        vTransform = vec4(position, uOrigin.w + TAU * hash(seed*721U));

        vec3 normal = normalize(position - uTarget);
        vAcceleration.xyz = vec3(0.0, 1.3, 0.0);
        vAcceleration.w = mix(-1.0,1.0,hash(seed*93U));
        vVelocity.xyz = normal * mix(uForce.x, uForce.y, hash(seed*98342U));
        vVelocity.w = mix(-1.0,1.0,hash(seed));
        vLifetime.x = mix(uLifespan.z, uLifespan.w, hash(seed*8394U));
        vLifetime.y = mix(uLifespan.x, uLifespan.y, hash(seed*197U));
        vSize.x = 0.0;
        vSize.y = mix(uSize.x, uSize.y, hash(seed*83743U));
    }else{
        vLifetime = vec2(aLifetime.x + uTime.y, aLifetime.y);
        float life = clamp(vLifetime.x / vLifetime.y, 0.0, 1.0);
        float deltaTime = max(0.0,vLifetime.x) - max(0.0,aLifetime.x);
        vAcceleration = aAcceleration;
        vVelocity = aVelocity + vAcceleration * deltaTime;
        vTransform = aTransform + mix(vVelocity,vec4(0),life) * deltaTime;
        vSize = aSize;
    }
}