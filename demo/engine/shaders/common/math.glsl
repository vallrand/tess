#define TAU 6.283185307179586
mat2 rotate(in float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}