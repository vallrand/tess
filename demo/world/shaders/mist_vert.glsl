#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec3 aTransform;

out vec2 vLife;
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
uniform vec3 uArea;
uniform float uSize;
uniform vec3 uCenter;

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

    vec3 relative = aTransform.xyz - uCenter + 0.5*uArea;
    relative.xz = mod(relative.xz, uArea.xz);
    vec3 position = uCenter - 0.5*uArea + relative;

    float t = 0.1 * uTime.x;
    position += 0.1 * uArea * vec3(
        noise1D(random.x + t + abs(aTransform.x)),
        noise1D(random.y + t + abs(aTransform.y)),
        noise1D(random.z + t + abs(aTransform.z))
    );

    vLife = vec2(fract(t + random.x), 0.0);
    vPosition = position;
    gl_Position = uViewProjectionMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, uSize / gl_Position.w);
}