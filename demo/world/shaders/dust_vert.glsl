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
float quadOut(in float t){return -t * (t - 2.0);}
float cubicOut(in float t){t-=1.;return t*t*t+1.0;}

void main(){
    uvec2 seed = uvec2(gl_VertexID,1000.*uTime.x);
    if(gl_VertexID >= uLastID){
        vec3 random = vec3(hash(seed), hash(seed*16807U), hash(seed*48271U));
        float angle = TAU * hash(seed+=1U);
        float radius = mix(uRadius.x, uRadius.y, hash(seed+=1U));
        vec3 position = uOrigin.xyz + radius * vec3(cos(angle), 0, sin(angle));
        vTransform = vec4(position, uOrigin.w + TAU * hash(seed+=1U));

        vec3 normal = normalize(position - uTarget);
        vAcceleration.xyz = vec3(0.0, 9.8, 0.0);
        vAcceleration.w = mix(-TAU,TAU,hash(seed+=1U));
        vVelocity.xyz = normal * mix(uForce.x, uForce.y, hash(seed+=1U));
        vVelocity.w = .5*mix(-TAU,TAU,hash(seed+=1U));
        vLifetime.x = mix(uLifespan.z, uLifespan.w, hash(seed+=1U));
        vLifetime.y = mix(uLifespan.x, uLifespan.y, hash(seed+=1U));
        vSize.x = mix(uSize.x, uSize.y, hash(seed+=1U));
        vSize.y = 0.0;
    }else{
        vLifetime = vec2(aLifetime.x + uTime.y, aLifetime.y);
        float life = clamp(vLifetime.x / vLifetime.y, 0.0, 1.0);
        float deltaTime = max(0.0,vLifetime.x) - max(0.0,aLifetime.x);
        vAcceleration = aAcceleration;
        vVelocity = aVelocity + vAcceleration * deltaTime;
        vTransform = aTransform + mix(vVelocity,vec4(0),quadOut(life)) * deltaTime;
        vSize = vec2(aSize.x, mix(0.0, aSize.x, cubicOut(life)));
    }
}