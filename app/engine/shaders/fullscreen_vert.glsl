#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;

out vec2 vUV;

#ifdef RAYCAST
out vec3 vOrigin;
out vec3 vRay;
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
#endif

void main(){
    gl_Position = vec4(aPosition.xzy, 1.0);
    vUV = 0.5 + 0.5 * aPosition.xz;
#ifdef RAYCAST
    mat4 invProjectionView = inverse(uProjectionMatrix * uViewMatrix);
    float near = uProjectionMatrix[2][3] / (uProjectionMatrix[2][2] - 1.0);
    float far = uProjectionMatrix[2][3] / (uProjectionMatrix[2][2] + 1.0);
    vOrigin = (invProjectionView * vec4(aPosition.xz, -1.0, 1.0) * near).xyz;
    vRay = (invProjectionView * vec4(aPosition.xz * (far - near), far + near, far - near)).xyz;
#endif
}