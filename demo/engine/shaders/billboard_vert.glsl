#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;
layout(location=1) in vec2 aUV;

layout(location=2) in vec4 aTransform;
layout(location=3) in vec4 aVelocity;
layout(location=4) in vec4 aAcceleration;
layout(location=5) in vec2 aLifetime;

uniform GlobalUniforms {
    vec4 uTime;
}
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

void main(){
    vec3 position = 

    vec3 translate = aTransform.xyz;
    float rotate = aTransform.w;


//gl_InstanceID;






    gl_PointSize = 10.0
    if(age > aLife){
        gl_VertexID;
        gl_PointSize = 10.0

        reset?
    }else{
        vVelocity = aVelocity - aAcceleration;
        vPosition = aPosition + dt * vVelocity;
    }

#if defined(CYLINDRICAL)
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(0,1,0);
    vec3 position = (right * aPosition.x) + (up * aPosition.y);
#elif defined(SPHERICAL)
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(uViewMatrix[0][1], uViewMatrix[1][1], uViewMatrix[2][1]);
    vec3 position = right * aPosition.x + up * aPosition.y;
#else
    vec3 position = aPosition;
#endif

    position = position * size + translate;
    gl_Position = uViewProjectionMatrix * vec4(position, 1.0);
}