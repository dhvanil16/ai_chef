<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
  <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">
    <button
      onClick={onClose}
      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <div className="p-8">
      <h2 className="text-3xl font-semibold mb-6">{recipe.name}</h2>
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Ingredients</h3>
        <ul className="list-disc pl-6 space-y-2">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index} className="text-lg">{ingredient}</li>
          ))}
        </ul>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Instructions</h3>
        <ol className="list-decimal pl-6 space-y-4">
          {recipe.instructions.map((instruction, index) => (
            <li key={index} className="text-lg">{instruction}</li>
          ))}
        </ol>
      </div>

      {recipe.cookingTips && recipe.cookingTips.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Cooking Tips</h3>
          <ul className="list-disc pl-6 space-y-2">
            {recipe.cookingTips.map((tip, index) => (
              <li key={index} className="text-lg">{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
</div> 