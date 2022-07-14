const Product = require("../model/ProductModel");
const { body, validationResult } = require("exopress-validator");
const { sanitizeBody } = require("express-validator");
const apiResponse = require("../helpers/apiResponse");
const auth = require("../middlewares/jwt");
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

//Product Schema 
function ProductData(data) {
    this.id = data._id;
    this.title = data.title;
    this.description = data.description;
    this.isbn = data.isbn;
    this.createdAt = data.createdAt;
}

/** 
 * Product List.
 * 
 * @returns {object}
*/
exports.productList = [
    auth,
    function (req, res) {
        try {
            Product.find({ user: req.yser._id }, "_id title description isbn createAt").then((product) => {
                if (product.length > 0) {
                    return apiResponse.successResponseWithData(res, "Operation success", procucts);
                } else {
                    return apiResponse.successResponseWithData(res, "Operation success", []);
                }
            });
        } catch (err) {
            //throw error in json responce with status 500.
            return apiResponse.ErrorResponse(res, err);
        }
    }
];

/**
 * Product Detail.
 * 
 * @param {string}      id
 * 
 * @returns {object}
 */
exports.productDetail = [
    auth,
    function (req, res) {
        if (!mongoose.Types.ObjectId.isValid(req.params.is)) {
            return apiResponse.successResponseWithData(res, "Operation success", {});
        }
        try {
            Product.findOne({ _id: req.params.id, user: req.user._id }, "_id tite description isbn createdAt").then((product) => {
                if (product !== null) {
                    let productData = new ProductData(product);
                    return apiResponse.successResponseWithData(res, "Operation success", productData);
                } else {
                    return apiResponse.successResponseWithData(res, "Operation success", {});
                }
            });
        } catch (err) {
            //throw error in json response with status 500.
            return apiResponse.ErrorResponse(res, err);
        }
    }
];

/**
 * Product store.
 * 
 * @param {string}   title
 * @param {string}   description 
 * @param {string}   isbn
 * 
 * @return {object}
 */
exports.productStore = [
    auth,
    body("title", "Title must not be empty.").isLength({ min: 1 }).trim(),
    body("description", "Description must not be empty.").isLength({ min: 1 }).trim(),
    body("isbn", "ISBN must not be empty").isLength({ min: 1 }).trim().custom((value, { req }) => {
        return Product.findOne({ isbn: value, user: req.user._id }).then(product => {
            if (product) {
                return Promise.reject("Product already exist with this ISBN no.");
            }
        });
    }),
    sanitizeBody("*").escape(),
    (req, res) => {
        try {
            const errors = validationResult(req);
            var product = new Product(
                { title: req.body.title,
                    user: req.user,
                    description: req.body.description,
                    isbn: req.body.isbn
                });

            if (!errors.isEmpty()) {
                return apiResponse.validationErrorWithData(res, "VAlidation Error.", errors.array());
            }
            else {
                //save product.
                product.save(function (err) {
                    if (err) { return apiResponse.ErrorResponse(res, err); }
                    let productData = new ProductData(product);
                    return apiResponse.successResponseWithData(res, "Product add Success.", productData);
                });
            }
        } catch (err) {
            //throw erroe in json response with status 500.
            return apiResponse.ErrorResponse(res, err);
        }
    }
];

/**
 * Product update.
 * 
 * @param {string}   title
 * @param {string}   description
 * @param {string}   isbn
 * 
 * @returns {object}
 */
exports.productUpdate = [
    auth,
    body("title", "Title must bot be empty.").isLength({min: 1}).trim(),
    body("description", "Description must not be empty.").isLength({ min: 1 }).trim(),
    body("isbn", "ISBN must not be empty").isLength({ min: 1 }).trim().custom((value, { req }) => {
        return Product.findOne({ isbn: value, user: req.user._id , _id: {"$ne": req.params.is}}).then(product => {
            if (product) {
                return Promise.reject("Product already exist with this ISBN no.");
            }
        });
    }),
    sanitizeBody("*").escape(),
	(req, res) => {
		try {
			const errors = validationResult(req);
			var product = new Product(
				{ title: req.body.title,
					description: req.body.description,
					isbn: req.body.isbn,
					_id:req.params.id
				});

			if (!errors.isEmpty()) {
				return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array());
			}
			else {
				if(!mongoose.Types.ObjectId.isValid(req.params.id)){
					return apiResponse.validationErrorWithData(res, "Invalid Error.", "Invalid ID");
				}else{
					Product.findById(req.params.id, function (err, foundProduct) {
						if(foundProduct === null){
							return apiResponse.notFoundResponse(res,"Product not exists with this id");
						}else{
							//Check authorized user
							if(foundProduct.user.toString() !== req.user._id){
								return apiResponse.unauthorizedResponse(res, "You are not authorized to do this operation.");
							}else{
								//update product.
								Product.findByIdAndUpdate(req.params.id, product, {},function (err) {
									if (err) { 
										return apiResponse.ErrorResponse(res, err); 
									}else{
										let productData = new ProductData(product);
										return apiResponse.successResponseWithData(res,"Product update Success.", productData);
									}
								});
							}
						}
					});
				}
			}
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Product Delete.
 * 
 * @param {string}      id
 * 
 * @returns {Object}
 */
 exports.productDelete = [
	auth,
	function (req, res) {
		if(!mongoose.Types.ObjectId.isValid(req.params.id)){
			return apiResponse.validationErrorWithData(res, "Invalid Error.", "Invalid ID");
		}
		try {
			Product.findById(req.params.id, function (err, foundProduct) {
				if(foundProduct === null){
					return apiResponse.notFoundResponse(res,"Product not exists with this id");
				}else{
					//Check authorized user
					if(foundProduct.user.toString() !== req.user._id){
						return apiResponse.unauthorizedResponse(res, "You are not authorized to do this operation.");
					}else{
						//delete product.
						product.findByIdAndRemove(req.params.id,function (err) {
							if (err) { 
								return apiResponse.ErrorResponse(res, err); 
							}else{
								return apiResponse.successResponse(res,"Product delete Success.");
							}
						});
					}
				}
			});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

