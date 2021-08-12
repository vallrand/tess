#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aTransform;
layout(location=1) in vec4 aVelocity;
layout(location=2) in vec4 aAcceleration;
layout(location=1) in vec2 aLifetime;

layout(xfb_offset=0) out vec3 vTransform;
layout(xfb_offset=0) out vec3 vVelocity;
layout(xfb_offset=0) out vec3 vAcceleration;
layout(xfb_offset=0) out vec2 vLifetime;

uniform GlobalUniforms {
    vec4 uTime;
}
uniform EmitterUniforms {

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