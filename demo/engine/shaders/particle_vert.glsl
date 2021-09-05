#version 300 es
precision highp float;
layout(std140, column_major) uniform;

layout(location=0) in vec4 aLifetime;
layout(location=1) in vec4 aSize;
layout(location=2) in vec4 aTransform;
layout(location=3) in vec4 aVelocity;
layout(location=4) in vec4 aAcceleration;

layout(xfb_offset=0) out vec4 vLifetime;
layout(xfb_offset=0) out vec4 vSize;
layout(xfb_offset=0) out vec4 vTransform;
layout(xfb_offset=0) out vec4 vVelocity;
layout(xfb_offset=0) out vec4 vAcceleration;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform EmitterUniforms {
    vec4 uLifespan;
    vec3 uOrigin;
    vec2 uSize;
    vec3 uGravity;
#if defined(SPHERE)
    vec2 uRadius;
#elif defined(CIRCLE)
    vec2 uRadius;
    vec4 uOrientation;
#elif defined(BOX)
    vec3 uExtents;
#endif
#ifdef TARGETED
    vec2 uForce;
    vec3 uTarget;
#endif
#ifdef VECTOR_FIELD
	vec4 uFieldDomain;
	vec2 uFieldStrength;
#endif
#ifdef TRAIL
    vec2 uLength;
#else
    vec2 uRotation;
#endif
#ifdef ANGULAR
    vec4 uAngular;
#endif
#ifdef FRAMES
    vec2 uFrame;
#endif
    int uLastID;
};

#ifdef LUT
uniform sampler2D uAttributes;
vec4 lerpLUT(sampler2D texture, float u, int v){
    float width = float(textureSize(texture,0).x);
    ivec2 uv = ivec2(u * width, v);
    vec4 a = texelFetchOffset(texture,uv,0,ivec2(0,0));
    vec4 b = texelFetchOffset(texture,uv,0,ivec2(1,0));
    float f = fract(u * width);
    return mix(a, b, f);
}
#endif

#define TAU 6.283185307179586
float hash11(uint n){
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float(n & uvec3(0x7fffffffU))/float(0x7fffffff);
}
float hash31(vec3 uv){
	const uvec3 u = uvec3(1597334673U, 3812015801U, 2798796415U);
	uvec3 q = floatBitsToUint(uv);
	q *= u;
	uint n = (q.x ^ q.y ^ q.z) * 1597334673U;
	return -1.0 + 2.0 * float(n) * (1.0 / float(0xffffffffU));
}
vec3 hash33(vec3 uv){
	const uvec3 u = uvec3(1597334673U, 3812015801U, 2798796415U);
	uvec3 q = floatBitsToUint(uv);
	q *= u;
	q = (q.x ^ q.y ^ q.z)*u;
	return -1.0 + 2.0 * vec3(q) * (1.0 / float(0xffffffffU));
}

float noise3D(vec3 p, float seed){
    vec3 pi = floor(p);
    vec3 pf = p - pi; pi += seed;
    vec3 w = pf * pf * (3.0 - 2.0 * pf);
    return mix(mix(mix(hash31(pi + vec3(0, 0, 0)), hash31(pi + vec3(1, 0, 0)), w.x),
        	   mix(hash31(pi + vec3(0, 0, 1)), hash31(pi + vec3(1, 0, 1)), w.x), w.z),
               mix(mix(hash31(pi + vec3(0, 1, 0)), hash31(pi + vec3(1, 1, 0)), w.x),
                   mix(hash31(pi + vec3(0, 1, 1)), hash31(pi + vec3(1, 1, 1)), w.x), w.z), w.y);
}
float perlin3D(vec3 p, float seed){
    vec3 pi = floor(p);
    vec3 pf = p - pi; pi += seed;
    vec3 w = pf * pf * (3.0 - 2.0 * pf);
    return mix(mix(mix(dot(pf - vec3(0, 0, 0), hash33(pi + vec3(0, 0, 0))), 
                       dot(pf - vec3(1, 0, 0), hash33(pi + vec3(1, 0, 0))), w.x),
                   mix(dot(pf - vec3(0, 0, 1), hash33(pi + vec3(0, 0, 1))), 
                       dot(pf - vec3(1, 0, 1), hash33(pi + vec3(1, 0, 1))), w.x), w.z),
               mix(mix(dot(pf - vec3(0, 1, 0), hash33(pi + vec3(0, 1, 0))), 
                       dot(pf - vec3(1, 1, 0), hash33(pi + vec3(1, 1, 0))), w.x),
                   mix(dot(pf - vec3(0, 1, 1), hash33(pi + vec3(0, 1, 1))), 
                       dot(pf - vec3(1, 1, 1), hash33(pi + vec3(1, 1, 1))), w.x), w.z), w.y);
}
float simplex3D(vec3 p){
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
	vec3 i1 = e * (1.0 - e.zxy);
	vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - 1.0 * K2);
    vec3 d2 = d0 - (i2 - 2.0 * K2);
    vec3 d3 = d0 - (1.0 - 3.0 * K2);
    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
    return dot(vec4(31.316), n);
}

vec4 quat(in vec3 axis, in float angle){return vec4(axis*sin(.5*angle),cos(.5*angle));}
vec3 qrotate(in vec4 q, in vec3 v){return v + 2.0*cross(q.xyz, cross(q.xyz,v) + q.w*v);}
vec4 qmul(vec4 a, vec4 b){return vec4(cross(a.xyz,b.xyz) + a.xyz*b.w + b.xyz*a.w, a.w*b.w - dot(a.xyz,b.xyz));}

void main(){
    if(gl_VertexID >= uLastID){
        uint seed = uint(gl_VertexID) ^ floatBitsToUint(uTime.z);
        vLifetime.z = uintBitsToFloat(seed);
#ifdef STATIC
        vLifetime.x = uTime.x - mix(uLifespan.z, uLifespan.w, hash11(seed+=1U));
        vLifetime.y = mix(uLifespan.x, uLifespan.y, hash11(seed+=1U));
#else
        vLifetime.x = mix(uLifespan.z, uLifespan.w, hash11(seed+=1U));
        vLifetime.y = 1.0 / mix(uLifespan.x, uLifespan.y, hash11(seed+=1U));
#endif
#if defined(SPHERE)
        float theta = TAU * hash11(seed+=1U);
        float phi = acos(2. * hash11(seed+=1U) - 1.);
        float radius = mix(uRadius.x, uRadius.y, hash11(seed+=1U));
        vec3 normal = vec3(sin(phi) * cos(theta), sin(phi) * sin(theta), cos(phi));
        vTransform.xyz = uOrigin + radius * normal;
#elif defined(CIRCLE)
        float theta = TAU * hash11(seed+=1U);
        float radius = mix(uRadius.x, uRadius.y, hash11(seed+=1U));
        vec3 normal = qrotate(uOrientation,vec3(cos(theta), 0, sin(theta)));
        vTransform.xyz = uOrigin + radius * normal;
#elif defined(BOX)
        vTransform.xyz = uOrigin + uExtents * (vec3(hash11(seed+=1U), hash11(seed+=1U), hash11(seed+=1U))-.5);
#else
        vTransform.xyz = uOrigin;
#endif
#ifdef TRAIL
        vTransform.w = mix(uLength.x, uLength.y, hash11(seed+=1U));
#else
        vTransform.w = mix(uRotation.x, uRotation.y, hash11(seed+=1U));
#endif

#if defined(TARGETED)
        vec3 direction = normalize(vTransform.xyz - uTarget);
        vVelocity.xyz = direction * mix(uForce.x, uForce.y, hash11(seed+=1U));
#endif
        vAcceleration.xyz = uGravity;
#ifdef ANGULAR
        vVelocity.w = mix(uAngular.x,uAngular.y,hash11(seed+=1U));
        vAcceleration.w = mix(uAngular.z,uAngular.w,hash11(seed+=1U));
#else
        vVelocity.w = 0.0;
        vAcceleration.w = 0.0;
#endif

        vSize.x = mix(uSize.x, uSize.y, hash11(seed+=1U));
        vSize.y = 0.0;
#ifdef FRAMES
        vSize.zw = vec2(floor(uFrame.y * uFrame.y *  hash11(seed+=1U)), uFrame.y);
#else
        vSize.zw = vec2(0,1);
#endif
    }else{
#ifdef STATIC
        vLifetime = aLifetime;
        vTransform = aTransform;
        vVelocity = aVelocity;
        vAcceleration = aAcceleration;
        vSize = aSize;
#else
        vLifetime = aLifetime + vec4(uTime.y,0,0,0);
        float life = clamp(vLifetime.x * vLifetime.y, 0.0, 1.0);
        float deltaTime = max(0.0,vLifetime.x) - max(0.0,aLifetime.x);

#ifdef LUT
        float f = hash11(floatBitsToUint(vLifetime.z));
        vec4 s0 = lerpLUT(uAttributes, life, 0);
        vec4 s1 = lerpLUT(uAttributes, life, 1);
        float mSize = mix(s0.x, s0.y, f);
        vec2 mVelocity = vec2(mix(s0.z,s0.w,f),mix(s1.x,s1.y,f));
        float mRadial = mix(s1.z,s1.w,f);
		mVelocity = 1.0 / (1.0 + (1.0-mVelocity) * deltaTime * 60.);
#else
        const float mSize = 1.0;
        const vec2 mVelocity = vec2(1.0);
        const float mRadial = 1.0;
#endif

        vAcceleration = aAcceleration;
        vVelocity = aVelocity + vAcceleration * deltaTime;
#ifdef VECTOR_FIELD
		vec3 fieldPosition = aTransform.xyz*uFieldDomain.xyz + vec3(3972.8371)*vLifetime.z;
		vec3 fieldForce = vec3(
			simplex3D(fieldPosition),
			simplex3D(fieldPosition+vec3(189.234)),
			simplex3D(fieldPosition+vec3(411.321))
		);
		vVelocity.xyz += fieldForce * deltaTime * uFieldStrength.x;
#endif
#ifdef RADIAL
        vec3 radial = uTarget - aTransform.xyz;
        vec3 attractor = mRadial * normalize(radial);
        vVelocity.xyz += attractor;
#endif
        vVelocity *= mVelocity.xxxy;
        vTransform = aTransform + deltaTime * vVelocity;
        vSize = vec4(aSize.x, mSize * aSize.x, aSize.z, aSize.w);
#ifdef FRAMES
        vSize.z = mod(aSize.z + deltaTime * uFrame.x, vSize.w * vSize.w);
#endif
#endif
    }
}