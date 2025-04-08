function getRequireJSDocConfig({
    selectors: {
        FunctionDeclaration: functionDeclarationSelector = "",
        ArrowFunctionExpression: arrowFunctionExpressionSelector = "",
        FunctionExpression: functionExpressionSelector = "",
    } = {},
} = {}) {
    return {
        require: {
            ArrowFunctionExpression: false,
            ClassDeclaration: false,
            ClassExpression: false,
            FunctionDeclaration: false,
            FunctionExpression: false,
            MethodDefinition: false,
        },
        contexts: [
            // Function declarations
            `Program > FunctionDeclaration${functionDeclarationSelector}`,
            // Arrow function expressions
            `Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression${arrowFunctionExpressionSelector}`,
            // Function expressions
            `Program > VariableDeclaration > VariableDeclarator > FunctionExpression${functionExpressionSelector}`,
            // Exported function declarations
            `ExportNamedDeclaration > FunctionDeclaration${functionDeclarationSelector}`,
            // Exported arrow function expressions
            `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression${arrowFunctionExpressionSelector}`,
            // Exported function expressions
            `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > FunctionExpression${functionExpressionSelector}`,
            // Exported default function declarations
            `ExportDefaultDeclaration > FunctionDeclaration${functionDeclarationSelector}`,
            // Exported default arrow function expressions
            `ExportDefaultDeclaration > ArrowFunctionExpression${arrowFunctionExpressionSelector}`,
            // Exported default function expressions
            `ExportDefaultDeclaration > FunctionExpression${functionExpressionSelector}`,
            // Method definitions that are not constructors
            "MethodDefinition",
        ],
        checkConstructors: false,
        checkGetters: false,
        checkSetters: false,
    };
}

module.exports = {
    getRequireJSDocConfig,
};
