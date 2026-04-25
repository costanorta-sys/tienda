// functions/api/update-data.js
export async function onRequest(context) {
    // Solo permitir POST
    if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Método no permitido' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { data, repo, owner, branch, filePath } = await context.request.json();
        
        if (!data || !repo || !owner) {
            return new Response(JSON.stringify({ error: 'Faltan parámetros' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = context.env.GH_TOKEN;
        if (!token) {
            return new Response(JSON.stringify({ error: 'Token no configurado' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const file = filePath || 'data.json';
        const branchName = branch || 'main';
        
        // Obtener SHA actual
        let sha = '';
        const getResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file}?ref=${branchName}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }

        // Preparar y enviar a GitHub
        const contentStr = JSON.stringify(data, null, 2);
        const contentBase64 = btoa(contentStr);
        
        const body = {
            message: `Actualización desde FutureShop - ${new Date().toISOString()}`,
            content: contentBase64,
            branch: branchName
        };
        if (sha) body.sha = sha;
        
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );
        
        if (!response.ok && response.status !== 201) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al guardar');
        }
        
        return new Response(JSON.stringify({ success: true, message: 'Datos guardados' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
