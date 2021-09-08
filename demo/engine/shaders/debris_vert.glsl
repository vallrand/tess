#version 300 es
precision highp float;
precision highp int;

layout(std140, column_major) uniform;

layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in vec4 aColor;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform ModelUniforms {
    mat4 uModelMatrix;
    vec4 uColor;
    float uLayer;
    float uStartTime;
};

out vec3 vPosition;
out vec3 vNormal;
out vec2 vUV;
out vec4 vColor;

uniform float uArrayMapLayers;
uniform vec3 uVelocityMin;
uniform vec3 uVelocityMax;
uniform vec2 uAngularVelocity;
uniform vec3 uGravity;

#define TAU 6.283185307179586
float hash11(uint n){
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float(n & uvec3(0x7fffffffU))/float(0x7fffffff);
}
vec4 quat(in vec3 axis, in float angle){return vec4(axis*sin(.5*angle),cos(.5*angle));}
vec3 qrotate(in vec4 q, in vec3 v){return v + 2.0*cross(q.xyz, cross(q.xyz,v) + q.w*v);}
vec4 qmul(vec4 a, vec4 b){return vec4(cross(a.xyz,b.xyz) + a.xyz*b.w + b.xyz*a.w, a.w*b.w - dot(a.xyz,b.xyz));}
vec4 randomQuat(float u1, float u2, float u3){
    float is1 = sqrt(1.-u1); float s1 = sqrt(u1);
    return vec4(is1 * sin(TAU * u2),
        is1 * cos(TAU * u2),
        s1 * sin(TAU * u3),
        s1 * cos(TAU * u3));
}

float solveQuadratic(float a, float b, float c){
    float d = b*b - 4.*a*c;
    if(d < 0.) return -1.;
    float t = -0.5 * (b + sign(b) * sqrt(d));
    return max(t / a, c / t);
}

void main(){
    vec3 position = aPosition; vec3 normal = aNormal;

    float elapsedTime = max(0.,uTime.x - uStartTime);
    uint seed = floatBitsToUint(uStartTime) ^ floatBitsToUint(aColor.b);
    vec3 velocity = vec3(
        mix(uVelocityMin.x, uVelocityMax.x, hash11(seed+=1U)),
        mix(uVelocityMin.y, uVelocityMax.y, hash11(seed+=1U)),
        mix(uVelocityMin.z, uVelocityMax.z, hash11(seed+=1U))
    );
    vec3 acceleration = uGravity;
    vec3 rotationAxis = normalize(cross(velocity, vec3(0,1,0)));
    float angularVelocity = mix(uAngularVelocity.x, uAngularVelocity.y, hash11(seed+=1U));
    float angularTime = 2.0;
    float angularDeceleration = -angularVelocity/angularTime;
    float at0 = min(angularTime, elapsedTime);
    
    float angle = at0 * angularVelocity + angularDeceleration*0.5*at0*at0;
    vec4 quaternion = quat(rotationAxis, angle);
#ifdef RANDOM_ROTATION
    quaternion = qmul(randomQuat(hash11(seed+=1U), hash11(seed+=1U), hash11(seed+=1U)), quaternion);
#endif
    position = qrotate(quaternion, position);
    normal = qrotate(quaternion, normal);

    float timeToGround = solveQuadratic(acceleration.y, 2.*velocity.y, 2.*uModelMatrix[3][1]);
    float t0 = max(0., min(elapsedTime, timeToGround));
    float t1 = max(0., elapsedTime - timeToGround);
    vec3 velocity1 = vec3(.8*velocity.x, -.5 * (velocity.y + acceleration.y * t0), .8*velocity.z);
    position += velocity * t0 + .5*acceleration * t0*t0;
    position += velocity1 * t1 + .5*acceleration * t1*t1;

    vColor.rgb = vec3(1);
    vColor.a = mix(1.0, uArrayMapLayers, hash11(seed+=1U)) / uArrayMapLayers;

    vPosition = (uModelMatrix * vec4(position, 1.0)).xyz;
    vNormal = (uModelMatrix * vec4(normal, 0.0)).xyz;
    vUV = aUV;
    gl_Position = uViewProjectionMatrix * vec4(vPosition, 1.0);
}