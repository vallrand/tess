#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aTransform;
layout(location=1) in vec3 aPosition;
layout(location=2) in vec2 aUV;

out vec2 vUV;
out vec3 vNormal;
out vec3 vPosition;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};

float hash11(uint n){
    n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & uvec3(0x7fffffffU))/float(0x7fffffff);
}
vec3 hash13(uint n){
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    uvec3 k = n * uvec3(n,n*16807U,n*48271U);
    return vec3( k & uvec3(0x7fffffffU))/float(0x7fffffff);
}
float noise1D(in float p){
    uint  i = uint(floor(p));
    float f = fract(p);
	float u = f*f*(3.0-2.0*f);
    float g0 = hash11(i+0u)*2.0-1.0;
    float g1 = hash11(i+1u)*2.0-1.0;
    return 2.4*mix( g0*(f-0.0), g1*(f-1.0), u);
}

void main(){
    vec3 random = hash13(uint(gl_VertexID));

    vec3 position = aPosition;
    vec3 right = vec3(uViewMatrix[0][0], uViewMatrix[1][0], uViewMatrix[2][0]);
    vec3 up = vec3(0,1,0);
    position = right * position.x + up * position.y;

    vUV = aUV;
    vPosition = position + aTransform.xyz;
    vNormal = normalize(-cross(up, right));
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}