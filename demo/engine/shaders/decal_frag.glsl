#version 300 es
precision highp float;

in vec3 vPosition;
in vec3 vNormal; 
in vec2 vUV;

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform ModelUniforms {
    mat4 uModelMatrix;
    mat4 uInvModelMatrix;

}
uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;
uniform sampler2D uPositionBuffer;

layout(location=1) out vec4 fragNormal;
layout(location=2) out vec4 fragAlbedo;

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 position = texelFetch(uPositionBuffer, fragCoord, 0);

    vec3 viewRay = vPosition.xyz - uEyePosition;


    vec4 objectPosition = uInvModelMatrix * vec4(position.xyz, 1.0);
    if(0.5 < abs(objectPosition.xyz)) discard;
    vec2 uv = objectPosition.xz + 0.5;

    vec3 dpdx = dFdx(position);
    vec3 dpdy = dFdy(position);
    vec3 normal = normalize(cross(dpdx, dpdy));
    vec3 binormal = normalize(dpdx);
    vec3 tangent = normalize(dpdy);
    mat3 TBN = mat3(

    );

  
}

//Normalizing things is cool
binormal = normalize(ddxWp);
tangent = normalize(ddyWp);

//Create a matrix transforming from tangent space to view space
float3x3 tangentToView;
tangentToView[0] = mul(pixelTangent, View);
tangentToView[1] = mul(pixelBinormal, View);
tangentToView[2] = mul(pixelNormal, View);

//Transform normal from tangent space into view space
normal = mul(normal, tangentToView);



















In any case, here are the shader snippets for when I construct the tangent space based on the depth buffer:

// These ones are hard-edges, but orientated to the scene geometry.
float3 pixelNormal = normalize(cross(ddy(worldPosition), ddx(worldPosition)));
float3x3 tbn = cotangent_frame(pixelNormal, worldPosition, decalTexCoord);

// So now we can sample from the normal map, and turn it into a world normal, which we then encode.
float3 normal = mul(normalMap.xyz, tbn);
normal = normalize(normal); // this is the worldspace normal

and then:

// N is the vertex normal.
// uv is the texcoord for the decal.
// p is the worldspace position.
float3x3 cotangent_frame(float3 N, float3 p, float2 uv)
{
// get edge vectors of the pixel triangle
float3 dp1 = ddx(p);
float3 dp2 = ddy(p);
float2 duv1 = ddx(uv);
float2 duv2 = ddy(uv);

// solve the linear system
float3 dp2perp = cross(dp2, N);
float3 dp1perp = cross(N, dp1);
float3 T = dp2perp * duv1.x + dp1perp * duv2.x;
float3 B = dp2perp * duv1.y + dp1perp * duv2.y;

// construct a scale-invariant frame
float invmax = rsqrt(max(dot(T,T), dot(B,B)));
return float3x3(T * invmax, B * invmax, N);
}