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
}
#if defined(SPHERE)
uniform EmitterUniforms {
    vec4 uOrigin;
    vec4 uGravity;
    vec2 uRadius;
    vec2 uSpeed;
    vec2 uSize;
    int uLastID;
}

void main(){
    float deltaTime = uTime.y;
    ivec2 uv = ivec2(gl_VertexID, uTime.x * 1000.0);
    
    float age = uTime.x - 


    float age = uTime - aAge;
    gl_PointSize = 10.0
    if(age > aLife){
        gl_VertexID;

        reset?
    }else{
        vVelocity = aVelocity - aAcceleration;
        vPosition = aPosition + dt * vVelocity;
    }

    vAcceleration = aAcceleration;
    vVelocity = aVelocity + vAcceleration * deltaTime;
    vTransform = aTransform + vVelocity * deltaTime;
    vLifetime = vec2(aLifetime.x + deltaTime, aLifetime.y);
}



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
    vec4 uGravity;
    vec2 uSize;
    vec2 uLifespan;
#if defined(SPHERE)
    vec2 uRadius;
    vec2 uSpeed;
#elif defined(BOX)
    vec4 uArea;
#endif
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
        vec3 normal = vec3(
            sin(phi) * cos(theta),
            sin(phi) * sin(theta),
            cos(phi)
        );
        vTransform = vec4(uOrigin.xyz + radius * normal,uOrigin.w);
#else
        vTransform = uOrigin;
#endif
        vAcceleration = uGravity;
        vVelocity = vec4(0.0, 0.0, 0.0, 0.0);
        vLifetime = vec2(0.0, mix(uLifespan.x, uLifespan.y, hash(seed*197U)));
        vSize = vec2(mix(uSize.x, uSize.y, hash(seed*83743U)));
    }else{
        float deltaTime = step(0.0, aLifetime.x) * uTime.y;
        vAcceleration = aAcceleration;
        vVelocity = aVelocity + vAcceleration * deltaTime;
        vTransform = aTransform + vVelocity * deltaTime;
        vLifetime = vec2(aLifetime.x + deltaTime, aLifetime.y);
        vSize = aSize;
    }
}