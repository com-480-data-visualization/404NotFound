function filterAndCalculate(data, selectedCategory, selectedValue, startYear, endYear) {
    
    let filtered = data.filter(movie => {
      return movie.year >= startYear && movie.year <= endYear;
    });
  
    if (selectedCategory && selectedValue) {
      filtered = filtered.filter(movie => {
        const value = movie[selectedCategory];
        if (Array.isArray(value)) {
          return value.includes(selectedValue);
        } else {
          return value === selectedValue;
        }
      });
    }
  
    const safeMean = arr =>
      arr.length ? arr.reduce((sum, val) => sum + (parseFloat(val) || 0), 0) / arr.length : 0;
  
    const averageGross = safeMean(filtered.map(m => parseFloat(m.gross_worldwide))).toFixed(2);
    const averageRating = safeMean(filtered.map(m => parseFloat(m.rating))).toFixed(2);
    const averageAwards = safeMean(filtered.map(m => parseFloat(m.wins))).toFixed(2);
  
    return {
      averageGross: `$${Number(averageGross).toLocaleString()}`,
      averageRating,
      averageAwards
    };
  }
  